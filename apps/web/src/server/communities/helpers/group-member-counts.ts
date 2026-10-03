import { count, inArray } from "drizzle-orm";

import { groupMembers } from "@repo/db";

import { type db } from "~/server/db";
import type { TestDatabase } from "~/server/test/pglite";

type DbClient = typeof db | TestDatabase;

export async function groupMemberCounts(
  database: DbClient,
  groupIds: readonly string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (groupIds.length === 0) {
    return counts;
  }

  const rows = await database
    .select({ groupId: groupMembers.groupId, memberCount: count() })
    .from(groupMembers)
    .where(inArray(groupMembers.groupId, [...groupIds]))
    .groupBy(groupMembers.groupId);

  for (const row of rows) {
    counts.set(row.groupId, Number(row.memberCount));
  }
  return counts;
}
