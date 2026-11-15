import { TRPCError } from "@trpc/server";

import { isKingOfTheCourt } from "@repo/domain/tournament-king";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** The Pool draw doors refuse King of the court: its draw is the Starting courts. */
export function assertNotKingOfTheCourt(
  game: { format: string; tournamentShape: string | null },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (isKingOfTheCourt(game.format, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournamentKing.errors.useStartingCourts,
    });
  }
}
