import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";
import * as schema from "@repo/db/schema";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";

const defaultMigrationsFolder = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../../../packages/db/drizzle",
);

export type TestDatabase = PgliteDatabase<typeof schema>;

export async function createPgliteDb(): Promise<{
  db: TestDatabase;
  client: PGlite;
  close: () => Promise<void>;
}> {
  const migrationsFolder =
    process.env.TEMBA_DRIZZLE_MIGRATIONS ?? defaultMigrationsFolder;
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
