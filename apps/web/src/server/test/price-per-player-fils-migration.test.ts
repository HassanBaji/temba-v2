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

const FILS_MIGRATION = "0048_price_per_player_fils";

type Journal = { entries: { idx: number; tag: string }[] };

function migrationsBeforeFils(temp: string) {
  const folder = join(temp, "drizzle");
  cpSync(migrationsFolder, folder, { recursive: true });

  const journalPath = join(folder, "meta", "_journal.json");
  const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
  const target = journal.entries.find((entry) => entry.tag === FILS_MIGRATION);
  if (!target) {
    throw new Error(`Missing migration ${FILS_MIGRATION}`);
  }
  journal.entries = journal.entries.filter((entry) => entry.idx < target.idx);
  writeFileSync(journalPath, JSON.stringify(journal, null, 2));

  return folder;
}

async function applyFilsMigration(client: PGlite) {
  const statements = readFileSync(
    join(migrationsFolder, `${FILS_MIGRATION}.sql`),
    "utf8",
  ).split("--> statement-breakpoint");

  for (const statement of statements) {
    const trimmed = statement.trim();
    if (trimmed.length > 0) {
      await client.exec(trimmed);
    }
  }
}

describe("games price_per_player_fils migration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    await cleanup?.();
    cleanup = null;
  });

  it("backfills fils as the old hundredths times ten and keeps the old column", async () => {
    const temp = mkdtempSync(join(tmpdir(), "temba-price-fils-migration-"));
    const client = new PGlite();
    const db = drizzle(client);
    cleanup = async () => {
      await client.close();
      rmSync(temp, { recursive: true, force: true });
    };

    await migrate(db, { migrationsFolder: migrationsBeforeFils(temp) });

    await client.exec(`
      insert into "user" (id, clerk_id, name, email, phone_number_verified, email_verified, created_at, updated_at)
      values ('00000000-0000-4000-8000-000000000001', 'user_price_fils', 'Ada', 'ada-price@example.com', false, true, now(), now());
      insert into "venues" (id, name, city, country)
      values ('00000000-0000-4000-8000-000000000002', 'Club', 'Lisbon', 'PT');
      insert into "games" (id, venue_id, created_by, price_per_player_cents)
      values
        ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 550),
        ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', 0),
        ('00000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001', null);
    `);

    await applyFilsMigration(client);

    const rows = await db.execute<{
      id: string;
      price_per_player_cents: number | null;
      price_per_player_fils: number | null;
    }>(sql`
      select id::text as id, price_per_player_cents, price_per_player_fils
      from games
      order by id
    `);

    expect(rows.rows.map((row) => row.price_per_player_fils)).toEqual([
      5500,
      0,
      null,
    ]);
    expect(rows.rows.map((row) => row.price_per_player_cents)).toEqual([
      550,
      0,
      null,
    ]);
  });
});
