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
