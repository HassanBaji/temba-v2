import { type db } from "~/server/db";
import type { InviteDb } from "~/server/invites/doors/types";

export function writeDb(database: InviteDb): typeof db {
  return database as typeof db;
}
