import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { afterEach, describe, expect, it } from "vitest";

const migrationsFolder =
  process.env.TEMBA_DRIZZLE_MIGRATIONS ??
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../packages/db/drizzle",
  );

const ONBOARDING_MIGRATION = "0034_user_preferred_position_and_onboarding";

type Journal = { entries: { idx: number; tag: string }[] };

/** A copy of the migrations folder stopping just before the Onboarding one. */
function migrationsBeforeOnboarding(temp: string) {
  const folder = join(temp, "drizzle");
  cpSync(migrationsFolder, folder, { recursive: true });

  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
  const onboarding = journal.entries.find(
    (entry) => entry.tag === ONBOARDING_MIGRATION,
  );
  if (!onboarding) {
    throw new Error(`Missing migration ${ONBOARDING_MIGRATION}`);
  }
  journal.entries = journal.entries.filter(
    (entry) => entry.idx < onboarding.idx,
  );
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  return folder;
}

async function applyOnboardingMigration(client: PGlite) {
  const statements = readFileSync(
    join(migrationsFolder, `${ONBOARDING_MIGRATION}.sql`),
    "utf8",
  ).split("--> statement-breakpoint");

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      await client.exec(trimmed);
    }
  }
}

describe("Preferred Position and onboarding completion migration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    await cleanup?.();
    cleanup = null;
  });

  it("backfills existing Users as complete without writing a Rating", async () => {
    const temp = mkdtempSync(join(tmpdir(), "temba-onboarding-migration-"));
    const client = new PGlite();
    const db = drizzle(client);
    cleanup = async () => {
      await client.close();
      rmSync(temp, { recursive: true, force: true });
    };

    await migrate(db, {
      migrationsFolder: migrationsBeforeOnboarding(temp),
    });

    await client.exec(`
      insert into "user" (clerk_id, name, email, phone_number_verified, email_verified, created_at, updated_at)
      values ('user_before_a', 'Ada', 'ada@example.com', false, true, '2025-01-02 03:04:05', now()),
             ('user_before_b', 'Bo', 'bo@example.com', false, true, '2025-06-07 08:09:10', now());
    `);
    await client.exec(`
      insert into "ratings" (user_id, sport, mu, phi, sigma, level_band)
      select id, 'padel', 1500, 350, 0.06, 'C2' from "user" where clerk_id = 'user_before_a';
    `);

    await applyOnboardingMigration(client);

    const rows = await db.execute<{
      clerk_id: string;
      created_at: Date;
      onboarding_completed_at: Date | null;
      preferred_position: string | null;
    }>(sql`
      select clerk_id, created_at, onboarding_completed_at, preferred_position
      from "user"
      order by clerk_id
    `);

    expect(rows.rows).toHaveLength(2);
    for (const row of rows.rows) {
      expect(row.onboarding_completed_at).not.toBeNull();
      expect(new Date(row.onboarding_completed_at!).getTime()).toBe(
        new Date(row.created_at).getTime(),
      );
      expect(row.preferred_position).toBeNull();
    }

    const ratings = await db.execute<{ count: number }>(
      sql`select count(*)::int as count from "ratings"`,
    );
    expect(ratings.rows[0]?.count).toBe(1);

    const bands = await db.execute<{ enumlabel: string }>(sql`
      select e.enumlabel
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'user_preferred_position'
      order by e.enumsortorder
    `);
    expect(bands.rows.map((row) => row.enumlabel)).toEqual([
      "left",
      "right",
      "either",
    ]);
  });

  it("leaves game_position untouched", async () => {
    const client = new PGlite();
    const db = drizzle(client);
    cleanup = async () => {
      await client.close();
    };

    await migrate(db, { migrationsFolder });

    const positions = await db.execute<{ enumlabel: string }>(sql`
      select e.enumlabel
      from pg_enum e
      join pg_type t on t.oid = e.enumtypid
      where t.typname = 'game_position'
      order by e.enumsortorder
    `);
    expect(positions.rows.map((row) => row.enumlabel)).toEqual([
      "left",
      "right",
    ]);
  });
});
