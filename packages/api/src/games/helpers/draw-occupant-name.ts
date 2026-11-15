import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

/** The name a draw refusal lists a Half team by: its player, else its team number. */
export function drawOccupantName(
  team: {
    sideIndex: number | null;
    players: readonly {
      gamePlayer: { user: { name: string } | null } | null;
    }[];
  },
  locale: Locale = DEFAULT_LOCALE,
) {
  const name = team.players[0]?.gamePlayer?.user?.name;
  if (name) {
    return name;
  }
  if (team.sideIndex != null) {
    return messagesFor(locale).tournament.errors.teamNumber(team.sideIndex);
  }
  return messagesFor(locale).tournament.gameTeam;
}
