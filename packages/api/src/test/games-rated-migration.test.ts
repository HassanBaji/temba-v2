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
  join(dirname(fileURLToPath(import.meta.url)), "../../../db/drizzle");

type Journal = { entries: { idx: number; tag: string }[] };

function ratedMigrationTag() {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
  ) as Journal;
  const entry = journal.entries.find((candidate) =>
    readFileSync(
      join(migrationsFolder, `${candidate.tag}.sql`),
      "utf8",
    ).includes('ADD COLUMN "rated"'),
  );
  if (!entry) {
    throw new Error("Missing the games.rated migration");
  }
  return entry;
}

describe("games.rated migration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    await cleanup?.();
    cleanup = null;
  });

  it("leaves every existing Game rated", async () => {
    const temp = mkdtempSync(join(tmpdir(), "temba-games-rated-migration-"));
    const client = new PGlite();
    const db = drizzle(client);
    cleanup = async () => {
      await client.close();
      rmSync(temp, { recursive: true, force: true });
    };

    const target = ratedMigrationTag();
    const folder = join(temp, "drizzle");
    cpSync(migrationsFolder, folder, { recursive: true });
    const journalPath = join(folder, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
    journal.entries = journal.entries.filter((entry) => entry.idx < target.idx);
    writeFileSync(journalPath, JSON.stringify(journal, null, 2));
    await migrate(db, { migrationsFolder: folder });

    await client.exec(`
      insert into "user" (id, clerk_id, name, email, phone_number_verified, email_verified, created_at, updated_at)
      values ('00000000-0000-4000-8000-000000000001', 'user_rated', 'Ada', 'ada-rated@example.com', false, true, now(), now());
      insert into "venues" (id, name, city, country)
      values ('00000000-0000-4000-8000-000000000002', 'Club', 'Lisbon', 'PT');
      insert into "games" (id, venue_id, created_by)
      values
        ('00000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001'),
        ('00000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000001');
    `);

    const statements = readFileSync(
      join(migrationsFolder, `${target.tag}.sql`),
      "utf8",
    ).split("--> statement-breakpoint");
    for (const statement of statements) {
      if (statement.trim().length > 0) {
        await client.exec(statement.trim());
      }
    }

    const rows = await db.execute<{ rated: boolean }>(
      sql`select rated from games`,
    );
    expect(rows.rows.map((row) => row.rated)).toEqual([true, true]);
  });
});
