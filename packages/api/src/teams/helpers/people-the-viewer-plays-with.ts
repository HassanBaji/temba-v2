import { aliasedTable, and, eq, inArray, isNull, ne } from "drizzle-orm";

import {
  gamePlayers,
  games,
  groupMembers,
  groups,
  teamMembers,
} from "@repo/db";

import { type db } from "#src/db";

type DbClient = typeof db;

const viewerSeat = aliasedTable(gamePlayers, "viewer_seat");

/**
 * Everyone the viewer shares a Group or a Team with, or has been on a Game
 * with. New team has no Roster to invite into yet, so these ties are what
 * lets the Captain find or recognise someone.
 */
export async function peopleTheViewerPlaysWith(
  database: DbClient,
  userId: string,
): Promise<string[]> {
  const viewerGroups = database
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .innerJoin(groups, eq(groups.id, groupMembers.groupId))
    .where(and(eq(groupMembers.userId, userId), isNull(groups.deletedAt)));
  const viewerTeams = database
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  const [groupmates, teammates, gamemates] = await Promise.all([
    database
      .selectDistinct({ userId: groupMembers.userId })
      .from(groupMembers)
      .where(
        and(
          inArray(groupMembers.groupId, viewerGroups),
          ne(groupMembers.userId, userId),
        ),
      ),
    database
      .selectDistinct({ userId: teamMembers.userId })
      .from(teamMembers)
      .where(
        and(
          inArray(teamMembers.teamId, viewerTeams),
          ne(teamMembers.userId, userId),
        ),
      ),
    database
      .selectDistinct({ userId: gamePlayers.userId })
      .from(gamePlayers)
      .innerJoin(viewerSeat, eq(viewerSeat.gameId, gamePlayers.gameId))
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .where(
        and(
          eq(viewerSeat.userId, userId),
          ne(gamePlayers.userId, userId),
          isNull(games.cancelledAt),
        ),
      ),
  ]);
  return [
    ...new Set(
      [...groupmates, ...teammates, ...gamemates]
        .map((row) => row.userId)
        .filter((id): id is string => id !== null),
    ),
  ];
}
