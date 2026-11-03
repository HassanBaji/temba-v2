import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { DEFAULT_FOOTBALL_SIDE_SIZE } from "./game-shape";
import { sportLabel } from "./sport";

/** The Standing preview draws this many rows before the first result. */
export const GROUP_STANDING_PREVIEW_SEATS = 4;

const PADEL_MATCH_PLAYERS = 4;

export function groupStandingAfterFirstResult(locale: Locale) {
  return messagesFor(locale).group.empty.standingAfterFirstResult;
}

export function groupGamesEmptyCopy(locale: Locale) {
  return messagesFor(locale).group.empty.games;
}

/** Players a first Game needs: a padel Match, or the default football side twice. */
export function groupGamePlayersNeeded(sport: string | null | undefined) {
  return sport === "football"
    ? 2 * DEFAULT_FOOTBALL_SIDE_SIZE
    : PADEL_MATCH_PLAYERS;
}

/** Positions of the open-seat rows that pad the Standing preview. */
export function groupStandingOpenSeats(memberCount: number): number[] {
  const open = Math.max(0, GROUP_STANDING_PREVIEW_SEATS - memberCount);
  return Array.from({ length: open }, (_, index) => memberCount + index + 1);
}

export function groupStandingEmptyFooter(memberCount: number, locale: Locale) {
  const m = messagesFor(locale).group.empty;
  if (memberCount >= GROUP_STANDING_PREVIEW_SEATS) {
    return m.standingAfterFirstResult;
  }
  return m.standingSeatsFilled(memberCount, GROUP_STANDING_PREVIEW_SEATS);
}

export function groupGamesEmptyLine(input: {
  sport: string | null | undefined;
  memberCount: number;
  isMember: boolean;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group.empty;
  const needed = groupGamePlayersNeeded(input.sport);
  const sport = sportLabel(input.sport, input.locale) ?? m.aGame;
  if (!input.isMember || input.memberCount >= needed) {
    return m.games;
  }
  return m.gamesNeedPlayers(sport, needed, input.memberCount);
}
