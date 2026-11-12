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

function setByRoleMigration() {
  const journal = JSON.parse(
    readFileSync(join(migrationsFolder, "meta", "_journal.json"), "utf8"),
  ) as Journal;
  const entry = journal.entries.find((candidate) =>
    readFileSync(
      join(migrationsFolder, `${candidate.tag}.sql`),
      "utf8",
    ).includes('ADD COLUMN "set_by_role"'),
  );
  if (!entry) {
    throw new Error("Missing the level_overrides.set_by_role migration");
  }
  return entry;
}

const SETTER = "00000000-0000-4000-8000-000000000001";
const PLAYER = "00000000-0000-4000-8000-000000000002";
const GROUP = "00000000-0000-4000-8000-000000000003";
const BY_OPERATOR = "00000000-0000-4000-8000-00000000000a";
const BY_LEVEL_SETTER = "00000000-0000-4000-8000-00000000000b";

describe("level_overrides.set_by_role migration", () => {
  let cleanup: (() => Promise<void>) | null = null;

  afterEach(async () => {
    await cleanup?.();
    cleanup = null;
  });

  it("backfills operator for an override with no Group and level_setter otherwise", async () => {
    const temp = mkdtempSync(join(tmpdir(), "temba-set-by-role-migration-"));
    const client = new PGlite();
    const db = drizzle(client);
    cleanup = async () => {
      await client.close();
      rmSync(temp, { recursive: true, force: true });
    };

    const target = setByRoleMigration();
    const folder = join(temp, "drizzle");
    cpSync(migrationsFolder, folder, { recursive: true });
    const journalPath = join(folder, "meta", "_journal.json");
    const journal = JSON.parse(readFileSync(journalPath, "utf8")) as Journal;
    journal.entries = journal.entries.filter((entry) => entry.idx < target.idx);
    writeFileSync(journalPath, JSON.stringify(journal, null, 2));
    await migrate(db, { migrationsFolder: folder });

    await client.exec(`
      insert into "user" (id, clerk_id, name, email, phone_number_verified, email_verified, created_at, updated_at)
      values
        ('${SETTER}', 'user_setter', 'Sara', 'sara-role@example.com', false, true, now(), now()),
        ('${PLAYER}', 'user_player', 'Omar', 'omar-role@example.com', false, true, now(), now());
      insert into "groups" (id, name, created_by) values ('${GROUP}', 'Padel Crew', '${SETTER}');
      insert into "level_overrides" (
        id, user_id, sport, set_by_user_id, group_id, reason, had_rating,
        mu_before, phi_before, sigma_before, level_band_before,
        mu_after, phi_after, sigma_after, level_band_after
      ) values
        ('${BY_OPERATOR}', '${PLAYER}', 'football', '${SETTER}', null, null, true,
         1500, 200, 0.06, 'C2', 1500, 150, 0.06, 'C2'),
        ('${BY_LEVEL_SETTER}', '${PLAYER}', 'padel', '${SETTER}', '${GROUP}', 'back_from_injury', true,
         1500, 200, 0.06, 'C2', 1500, 150, 0.06, 'C2');
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

    const rows = await db.execute<{
      id: string;
      set_by_role: string;
      note: string | null;
    }>(sql`select id, set_by_role, note from level_overrides order by id`);
    expect(rows.rows).toEqual([
      { id: BY_OPERATOR, set_by_role: "operator", note: null },
      { id: BY_LEVEL_SETTER, set_by_role: "level_setter", note: null },
    ]);
  });
});
