import { and, eq, inArray } from "drizzle-orm";

import { americanoSeats, gamePlayers, gameTeamPlayers } from "@repo/db";

import { mayHaveAmericanoSeats } from "#src/games/americano-matches";
import { type MatchRow } from "#src/games/utils";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function userIsOnMatchSlots(
  database: DbClient,
  match: MatchRow,
  userId: string,
) {
  const slotIds = [match.slot1GameTeamId, match.slot2GameTeamId].filter(
    (id): id is string => Boolean(id),
  );
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
  if (mayHaveAmericanoSeats(match)) {
    const seat = await database.query.americanoSeats.findFirst({
      where: and(
        eq(americanoSeats.matchId, match.id),
        eq(americanoSeats.gamePlayerId, player.id),
      ),
      columns: { id: true },
    });
    return Boolean(seat);
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
