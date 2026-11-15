import { TRPCError } from "@trpc/server";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

export function isPoolDrawPosted(game: { drawPostedAt: Date | null }) {
  return game.drawPostedAt != null;
}

export function assertPoolDrawNotPosted(
  game: { drawPostedAt: Date | null },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (isPoolDrawPosted(game)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: messagesFor(locale).tournament.errors.groupsDrawn,
    });
  }
}
