import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { Db } from "./index";
import * as schema from "./schema";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

// Procedures are typed against the production driver's `Db`. PGlite runs the
// same Drizzle query builder, so tests hand it over as `Db`; only raw
// `execute` result shapes differ between the two drivers.
export type TestDatabase = Db;

export async function createPgliteDb(): Promise<{
  db: TestDatabase;
  client: PGlite;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const pglite = drizzle(client, { schema });
  await migrate(pglite, { migrationsFolder });
  const db = pglite as unknown as TestDatabase;
  return {
    db,
    client,
    async close() {
      await client.close();
    },
  };
}

// `TestDatabase` is typed as the production `Db`, whose raw `execute` returns
// an array; PGlite returns `{ rows }`. Read raw results through this.
export function pgliteRows(result: unknown): Record<string, unknown>[] {
  return (result as { rows: Record<string, unknown>[] }).rows;
}
