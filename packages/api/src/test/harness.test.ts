import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { groups, user } from "@repo/db/schema";

import { createPgliteDb, pgliteRows } from "@repo/db/testing";

describe("PGLite Workspace harness", () => {
  it("applies DB Package migrations and answers a Drizzle query", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const tables = await db.execute(sql`
        select tablename
        from pg_catalog.pg_tables
        where schemaname = 'public'
          and tablename in ('user', 'groups', 'venues', 'games')
      `);

      const names = pgliteRows(tables)
        .map((row) => String(row.tablename))
        .sort();

      expect(names).toEqual(["games", "groups", "user", "venues"]);

      await expect(db.select().from(user)).resolves.toEqual([]);
      await expect(db.select().from(groups)).resolves.toEqual([]);
    } finally {
      await close();
    }
  });
});
