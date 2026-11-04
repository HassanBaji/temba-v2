import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { shortPlayerName } from "./player-name";
import type { Sport } from "./sport";
import { WIN_RATE_MIN_MATCHES, shownWinRatePercent } from "./win-rate";

export type ProfileAllTimeInput = {
  /** Padel unless asked, so callers that predate football keep their view. */
  sport?: Sport;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  /** Goals the User scored. Football only; padel has none. */
  goalsScored?: number;
  longestWinStreak: number;
  mostPlayedPartnerName: string | null;
  firstMatchAt: Date | string | null;
};

export type ProfileAllTimeView = {
  matchesPlayed: number;
  /** "2 won, 5 lost": labelled, so it reads the same way in Arabic. */
  record: string;
  /** Null until WIN_RATE_MIN_MATCHES, when `winRateNote` explains why. */
  winRatePercent: number | null;
  winRateNote: string | null;
  sinceLabel: string | null;
  sets: string;
  /** The sport's own tally row: Sets for padel, Goals for football. */
  tally: { label: string; value: string };
  longestStreak: string;
  partnerLabel: string;
  mostPlayedPartner: string;
};

const EMPTY_VALUE = "—";

export function matchYear(value: Date | string | null | undefined) {
  if (value == null) {
    return null;
  }
  const year = new Date(value).getFullYear();
  return Number.isFinite(year) ? year : null;
}

export function winStreakLabel(streak: number, locale: Locale) {
  if (streak <= 0) {
    return EMPTY_VALUE;
  }
  return messagesFor(locale).profile.wins(streak);
}

export function playingSinceLine(
  firstMatchAt: Date | string | null,
  locale: Locale,
) {
  const year = matchYear(firstMatchAt);
  return year == null
    ? null
    : messagesFor(locale).profile.allTime.playingSince(year);
}

export function profileAllTimeView(
  input: ProfileAllTimeInput,
  locale: Locale,
): ProfileAllTimeView {
  const m = messagesFor(locale).profile.allTime;
  const year = matchYear(input.firstMatchAt);
  const football = input.sport === "football";
  const sets =
    input.matchesPlayed > 0
      ? m.record(input.setsWon, input.setsLost)
      : EMPTY_VALUE;
  const winRate = shownWinRatePercent(input.matchesWon, input.matchesPlayed);
  const goals =
    input.matchesPlayed > 0 ? String(input.goalsScored ?? 0) : EMPTY_VALUE;
  return {
    matchesPlayed: input.matchesPlayed,
    record: m.record(input.matchesWon, input.matchesLost),
    winRatePercent: winRate,
    winRateNote:
      winRate == null
        ? messagesFor(locale).home.recentForm.winRateAfter(WIN_RATE_MIN_MATCHES)
        : null,
    sinceLabel: year == null ? null : m.since(year),
    sets,
    tally: football
      ? { label: m.goals, value: goals }
      : { label: m.sets, value: sets },
    longestStreak: winStreakLabel(input.longestWinStreak, locale),
    partnerLabel: football ? m.mostPlayedTeammate : m.mostPlayedPartner,
    mostPlayedPartner: input.mostPlayedPartnerName
      ? shortPlayerName(input.mostPlayedPartnerName)
      : EMPTY_VALUE,
  };
}
