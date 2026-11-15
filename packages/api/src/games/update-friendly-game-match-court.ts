import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { MatchStatusEnum, matches } from "@repo/db";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { type GameRow } from "#src/games/access";
import { assertCourtAssignable } from "#src/games/assert-court-assignable";
import { type db } from "#src/db";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function updateFriendlyGameMatchCourt(
  database: Tx,
  game: GameRow,
  matchId: string,
  courtId: string | null,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchOnCancelledGame,
    });
  }
  if (game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.courtEditFriendlyOnly,
    });
  }

  const match = await database.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (match?.gameId !== game.id) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).game.errors.matchNotFound,
    });
  }
  if (match.status === MatchStatusEnum.CANCELLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.matchCancelledEdit,
    });
  }
  if (courtId) {
    await assertCourtAssignable(database, game, courtId, locale);
  }
  await database
    .update(matches)
    .set({ courtId, updatedAt: new Date() })
    .where(eq(matches.id, match.id));
}
