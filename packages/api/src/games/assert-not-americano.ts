import { TRPCError } from "@trpc/server";

import { isAmericano } from "@repo/domain/tournament-americano";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** The Pool draw doors refuse an Americano: it makes its Rounds from the players. */
export function assertNotAmericano(
  game: { format: string; tournamentShape: string | null },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (isAmericano(game.format, game.tournamentShape)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).tournamentAmericano.errors.useMakeRounds,
    });
  }
}
