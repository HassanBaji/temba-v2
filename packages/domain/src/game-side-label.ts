import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

const SIDE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function formatGameSideLabel(
  format: string,
  sideIndex: number,
  locale: Locale,
) {
  const m = messagesFor(locale).createGame.side;
  if (format === "friendly_game" || format === "friendly_tournament") {
    const letter = SIDE_LETTERS[sideIndex - 1];
    return m.team(letter ?? String(sideIndex));
  }
  return m.team(String(sideIndex));
}

export function formatMatchSlotLabel(
  format: string,
  slot: 1 | 2,
  locale: Locale,
) {
  const m = messagesFor(locale).createGame.side;
  if (format === "friendly_game") {
    return m.team(slot === 1 ? "A" : "B");
  }
  return m.team(String(slot));
}

export function formatSeatSideHeading(
  sideNoun: string,
  sideIndex: number,
  sideCount: number,
  locale: Locale,
) {
  if (sideNoun === "Team") {
    if (sideCount === 2) {
      return formatGameSideLabel("friendly_game", sideIndex, locale);
    }
    return messagesFor(locale).createGame.side.team(String(sideIndex));
  }
  return `${sideNoun} ${sideIndex}`;
}

export function gameTeamDisplayName(
  side: {
    members: { name: string }[];
    name: string | null;
  },
  locale: Locale,
) {
  if (side.members.length > 0) {
    return side.members.map((member) => member.name).join(" / ");
  }
  return side.name ?? messagesFor(locale).createGame.side.gameTeam;
}

export function matchSlotOccupantLabel(
  sides: { id: string; members: { name: string }[]; name: string | null }[],
  gameTeamId: string | null,
  locale: Locale,
) {
  if (!gameTeamId) {
    return null;
  }
  const side = sides.find((row) => row.id === gameTeamId);
  return side ? gameTeamDisplayName(side, locale) : null;
}
