import { eq, max } from "drizzle-orm";

import { matchSets } from "@repo/db";

import type { CreateFriendlyDb } from "~/server/games/utils";

/** Next 1-based Set number within a Match — play order, not createdAt/uuid. */
export async function nextMatchSetNumber(
  database: CreateFriendlyDb,
  matchId: string,
): Promise<number> {
  const [row] = await database
    .select({ current: max(matchSets.setNumber) })
    .from(matchSets)
    .where(eq(matchSets.matchId, matchId));
  return (row?.current ?? 0) + 1;
}
