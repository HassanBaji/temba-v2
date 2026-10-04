import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

import type { EmbeddedDatabase } from "./index";
import * as schema from "./schema";

const migrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

export type TestDatabase = EmbeddedDatabase;

export async function createPgliteDb(): Promise<{
  db: TestDatabase;
  client: PGlite;
  close: () => Promise<void>;
}> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder });
  return {
    db,
    client,
    async close() {
      await client.close();
    },
  };
}
