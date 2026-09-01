import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";

import { gamePlayers, gameTeamPlayers } from "@repo/db";

import { type GameRow } from "~/server/games/access";
import { removeGameTeamAndPlayers } from "~/server/games/remove-game-team-and-players";
import { promoteWaitlist } from "~/server/games/promote-waitlist";
import {
  firstVacantPosition,
  isIndividualSeatGame,
  vacateSeat,
} from "~/server/games/seats";
import { type db } from "~/server/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function leaveRegisteredSeat(
  database: Tx,
  game: GameRow,
  userId: string,
  notRegisteredMessage = "You are not registered on this Game",
) {
  if (isIndividualSeatGame(game)) {
    const vacated = await vacateSeat(
      database,
      game,
      userId,
      notRegisteredMessage,
    );
    if (!game.cancelledAt) {
      const target =
        vacated ?? (await firstVacantPosition(database, game)) ?? undefined;
      await promoteWaitlist(database, game, target);
    }
    return;
  }

  const player = await database.query.gamePlayers.findFirst({
    where: and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.userId, userId)),
  });
  if (!player) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: notRegisteredMessage,
    });
  }

  const link = await database.query.gameTeamPlayers.findFirst({
    where: eq(gameTeamPlayers.gamePlayerId, player.id),
  });
  if (link) {
    await removeGameTeamAndPlayers(database, link.gameTeamId);
  } else {
    await database.delete(gamePlayers).where(eq(gamePlayers.id, player.id));
  }

  if (!game.cancelledAt) {
    await promoteWaitlist(database, game);
  }
}
