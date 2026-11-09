import { TRPCError } from "@trpc/server";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import type { GameRow } from "#src/games/access";
import { assertPoolDrawNotPosted } from "#src/games/assert-pool-draw-not-posted";

/** Individual Games of every format, and a tournament only before its Pool draw. */
export function assertOrganizerAddFormat(
  game: GameRow,
  locale: Locale = DEFAULT_LOCALE,
) {
  if (game.registrationMode !== "individual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).game.errors.teamOnly,
    });
  }
  assertPoolDrawNotPosted(game, locale);
}
