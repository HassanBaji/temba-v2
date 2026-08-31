import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { communities, user } from "@repo/db/schema";

import { createPgliteDb } from "~/server/test/pglite";

describe("PGLite Workspace harness", () => {
  it("applies DB Package migrations and answers a Drizzle query", async () => {
    const { db, close } = await createPgliteDb();
    try {
      const tables = await db.execute(sql`
        select tablename
        from pg_catalog.pg_tables
        where schemaname = 'public'
          and tablename in ('user', 'communities', 'venues', 'games')
      `);

      const names = tables.rows.map((row) => String(row.tablename)).sort();

      expect(names).toEqual(["communities", "games", "user", "venues"]);

      await expect(db.select().from(user)).resolves.toEqual([]);
      await expect(db.select().from(communities)).resolves.toEqual([]);
    } finally {
      await close();
    }
  });
});
