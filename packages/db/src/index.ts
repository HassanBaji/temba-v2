import type { PgliteDatabase } from "drizzle-orm/pglite";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

export * from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;
export type DbTx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export type DbClient = Db | PgliteDatabase<typeof schema>;

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

let instance: Db | undefined;

function connect(): Db {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not set");
  }
  const conn = globalForDb.conn ?? postgres(databaseUrl);
  if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;
  return drizzle(conn, { schema });
}

export const db: Db = new Proxy({} as Db, {
  get(_target, property) {
    instance ??= connect();
    const value: unknown = Reflect.get(instance, property, instance);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});
