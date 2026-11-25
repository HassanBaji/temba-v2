import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function gameFormatLabel(format: string, locale: Locale): string {
  const m = messagesFor(locale).createGame.format;
  switch (format) {
    case "friendly_game":
      return m.friendlyGame;
    case "americano":
      return m.americano;
    case "friendly_tournament":
      return m.friendlyTournament;
    default:
      return format.replaceAll("_", " ");
  }
}

/**
 * The format on a Game card. A Friendly game that counts for Temba Level
 * reads "Ranked game"; one that moves only Tier points, or nothing, stays
 * "Friendly game".
 */
export function gameCardFormatLabel(
  game: { format: string; rated: boolean },
  locale: Locale,
): string {
  if (game.format === "friendly_game" && game.rated) {
    return messagesFor(locale).createGame.format.rankedGame;
  }
  return gameFormatLabel(game.format, locale);
}
