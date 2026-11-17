import { TRPCError } from "@trpc/server";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { awaitsOrganizerTeams } from "@repo/domain/alone-teams";

/** An Alone-only Social has no Game teams to draw until its Organizer posts them. */
export function assertTeamsPosted(
  game: { organizerMakesTeams: boolean; teamsPostedAt: Date | null },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (awaitsOrganizerTeams(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).aloneTeams.errors.teamsFirst,
    });
  }
}
