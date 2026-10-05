import { type db } from "#src/db";
import type { InviteDb } from "#src/invites/doors/utils";

export function writeDb(database: InviteDb): typeof db {
  return database as typeof db;
}
