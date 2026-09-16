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

const SET_NUMBER_MIGRATION = "0036_match_set_number";

type Journal = { entries: { idx: number; tag: string }[] };

function migrationsBeforeSetNumber(temp: string) {
  const folder = join(temp, "drizzle");
  cpSync(migrationsFolder, folder, { recursive: true });

  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
  const target = journal.entries.find(
    (entry) => entry.tag === SET_NUMBER_MIGRATION,
  );
  if (!target) {
    throw new Error(`Missing migration ${SET_NUMBER_MIGRATION}`);
  }
  journal.entries = journal.entries.filter((entry) => entry.idx < target.idx);
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  return folder;
}

async function applySetNumberMigration(client: PGlite) {
  const statements = readFileSync(
    join(migrationsFolder, `${SET_NUMBER_MIGRATION}.sql`),
    "utf8",
  ).split("--> statement-breakpoint");

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      await client.exec(trimmed);
    }
  }
}

describe("match_sets set_number migration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    await cleanup?.();
    cleanup = null;
  });

  it("backfills existing Sets in createdAt then id order", async () => {
    const temp = mkdtempSync(join(tmpdir(), "temba-set-number-migration-"));
    const client = new PGlite();
    const db = drizzle(client);
    cleanup = async () => {
      await client.close();
      rmSync(temp, { recursive: true, force: true });
    };

    await migrate(db, {
      migrationsFolder: migrationsBeforeSetNumber(temp),
    });

    await client.exec(`
      insert into "user" (id, clerk_id, name, email, phone_number_verified, email_verified, created_at, updated_at)
      values ('00000000-0000-4000-8000-000000000001', 'user_set_number', 'Ada', 'ada-sets@example.com', false, true, now(), now());
      insert into "venues" (id, name, city, country)
      values ('00000000-0000-4000-8000-000000000002', 'Club', 'Lisbon', 'PT');
      insert into "games" (id, venue_id, created_by)
      values ('00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');
      insert into "matches" (id, game_id)
      values ('00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000003');
      insert into "match_sets" (id, match_id, created_at, slot_1_games_won, slot_2_games_won)
      values
        ('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-000000000004', '2026-09-01 12:00:00', 4, 6),
        ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000004', '2026-09-01 12:00:00', 6, 4),
        ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000004', '2026-09-01 12:00:01', 7, 5);
    `);

    await applySetNumberMigration(client);

    const rows = await db.execute<{
      id: string;
      set_number: number;
    }>(sql`
      select id::text as id, set_number
      from match_sets
      order by set_number
    `);

    expect(rows.rows.map((row) => row.set_number)).toEqual([1, 2, 3]);
    expect(rows.rows.map((row) => row.id)).toEqual([
      "00000000-0000-4000-8000-00000000000a",
      "00000000-0000-4000-8000-00000000000c",
      "00000000-0000-4000-8000-00000000000b",
    ]);
  });
});
