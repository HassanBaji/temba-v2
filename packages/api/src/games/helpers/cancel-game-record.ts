import { TRPCError } from "@trpc/server";
import { and, eq, ne } from "drizzle-orm";

import { MatchStatusEnum, gameWaitlist, games, matches } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { isDrawnTournament } from "@repo/domain/tournament-rounds";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { type GameRow } from "#src/games/access";

function keepsCompletedMatches(game: GameRow) {
  return isDrawnTournament(game.format, game.poolCount, game.tournamentShape);
}

/**
 * Cancelling sets every Match to cancelled except on a drawn tournament, so a
 * completed Match would drop out of Standing while its rating stays. An
 * Organizer cancels a Game only before its result is recorded.
 */
export async function assertGameCancellable(
  database: DbClient | DbTx,
  game: GameRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (keepsCompletedMatches(game)) {
    return;
  }
  const completed = await database.query.matches.findFirst({
    where: and(
      eq(matches.gameId, game.id),
      eq(matches.status, MatchStatusEnum.COMPLETED),
    ),
    columns: { id: true },
  });
  if (completed) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.cancelPlayed,
    });
  }
}

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
  const pendingOnly = keepsCompletedMatches(game)
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
