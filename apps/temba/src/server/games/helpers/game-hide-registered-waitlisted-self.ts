import { eq, inArray } from "drizzle-orm";

import { gamePlayers, gameWaitlist, teamMembers } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function gameHideRegisteredWaitlistedSelf(
  database: DbClient,
  gameId: string,
  selfId: string,
) {
  const players = await database.query.gamePlayers.findMany({
    where: eq(gamePlayers.gameId, gameId),
    columns: { userId: true },
  });
  const waitlist = await database.query.gameWaitlist.findMany({
    where: eq(gameWaitlist.gameId, gameId),
    columns: { userId: true, teamId: true },
  });
  const waitlistTeamIds = waitlist
    .map((row) => row.teamId)
    .filter((teamId): teamId is string => Boolean(teamId));
  const waitlistTeamMembers =
    waitlistTeamIds.length === 0
      ? []
      : await database.query.teamMembers.findMany({
          where: inArray(teamMembers.teamId, waitlistTeamIds),
          columns: { userId: true },
        });

  return [
    selfId,
    ...players.map((row) => row.userId),
    ...waitlist
      .map((row) => row.userId)
      .filter((userId): userId is string => Boolean(userId)),
    ...waitlistTeamMembers.map((row) => row.userId),
  ].filter((userId): userId is string => Boolean(userId));
}
