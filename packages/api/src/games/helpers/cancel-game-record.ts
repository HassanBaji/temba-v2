import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { MatchStatusEnum, gameWaitlist, games, matches } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { isDrawnTournament } from "@repo/domain/tournament-rounds";
import { type GameRow } from "#src/games/access";

export async function cancelGameRecord(
  database: DbClient | DbTx,
  game: GameRow,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Game is already cancelled",
    });
  }
  const now = new Date();
  await database
    .update(games)
    .set({ cancelledAt: now, updatedAt: now })
    .where(eq(games.id, game.id));
  await database.delete(gameWaitlist).where(eq(gameWaitlist.gameId, game.id));
  const pendingOnly = isDrawnTournament(
    game.format,
    game.poolCount,
    game.tournamentShape,
  )
    ? and(
        eq(matches.gameId, game.id),
        ne(matches.status, MatchStatusEnum.COMPLETED),
      )
    : eq(matches.gameId, game.id);
  await database
    .update(matches)
    .set({ status: MatchStatusEnum.CANCELLED, updatedAt: now })
    .where(pendingOnly);
}
