import { and, eq, inArray } from "drizzle-orm";

import { gamePlayers, gameTeamPlayers } from "@repo/db";

import { type MatchRow } from "~/server/games/utils";
import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function userIsOnMatchSlots(
  database: DbClient,
  match: MatchRow,
  userId: string,
) {
  const slotIds = [match.slot1GameTeamId, match.slot2GameTeamId].filter(
    (id): id is string => Boolean(id),
  );
  if (slotIds.length === 0) {
    return false;
  }
  const player = await database.query.gamePlayers.findFirst({
    where: and(
      eq(gamePlayers.gameId, match.gameId),
      eq(gamePlayers.userId, userId),
    ),
    columns: { id: true },
  });
  if (!player) {
    return false;
  }
  const link = await database.query.gameTeamPlayers.findFirst({
    where: and(
      eq(gameTeamPlayers.gamePlayerId, player.id),
      inArray(gameTeamPlayers.gameTeamId, slotIds),
    ),
    columns: { id: true },
  });
  return Boolean(link);
}
