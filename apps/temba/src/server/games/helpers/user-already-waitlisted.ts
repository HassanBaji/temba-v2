import { and, eq, inArray, isNull } from "drizzle-orm";

import { gameWaitlist, teamMembers } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function userAlreadyWaitlisted(
  database: DbClient,
  gameId: string,
  userId: string,
) {
  const row = await database.query.gameWaitlist.findFirst({
    where: and(
      eq(gameWaitlist.gameId, gameId),
      eq(gameWaitlist.userId, userId),
    ),
    columns: { id: true },
  });
  if (row) {
    return true;
  }

  const teamRows = await database.query.gameWaitlist.findMany({
    where: and(eq(gameWaitlist.gameId, gameId), isNull(gameWaitlist.userId)),
    columns: { teamId: true },
  });
  const teamIds = teamRows
    .map((entry) => entry.teamId)
    .filter((teamId): teamId is string => Boolean(teamId));
  if (teamIds.length === 0) {
    return false;
  }

  const membership = await database.query.teamMembers.findFirst({
    where: and(
      eq(teamMembers.userId, userId),
      inArray(teamMembers.teamId, teamIds),
    ),
    columns: { id: true },
  });
  return Boolean(membership);
}
