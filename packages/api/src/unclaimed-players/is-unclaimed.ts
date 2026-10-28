import { not, sql } from "drizzle-orm";

import { user } from "@repo/db";

export const unclaimedUserSql = sql`(${user.clerkId} is null and ${user.addedAt} is not null)`;

export const notUnclaimedUserSql = not(unclaimedUserSql);

export function isUnclaimed(row: {
  clerkId: string | null;
  addedAt: Date | null;
}): boolean {
  return row.clerkId === null && row.addedAt !== null;
}
