import { shortPlayerName } from "./player-name";
import { winRatePercent } from "./win-rate";

export type ProfileAllTimeInput = {
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  setsWon: number;
  setsLost: number;
  longestWinStreak: number;
  mostPlayedPartnerName: string | null;
  firstMatchAt: Date | string | null;
};

export type ProfileAllTimeView = {
  matchesPlayed: number;
  record: string;
  winRatePercent: number | null;
  sinceLabel: string | null;
  sets: string;
  longestStreak: string;
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

export function winStreakLabel(streak: number) {
  if (streak <= 0) {
    return EMPTY_VALUE;
  }
  return streak === 1 ? "1 win" : `${streak} wins`;
}

export function playingSinceLine(firstMatchAt: Date | string | null) {
  const year = matchYear(firstMatchAt);
  return year == null ? null : `Playing padel since ${year}`;
}

export function profileAllTimeView(
  input: ProfileAllTimeInput,
): ProfileAllTimeView {
  const year = matchYear(input.firstMatchAt);
  return {
    matchesPlayed: input.matchesPlayed,
    record: `${input.matchesWon}–${input.matchesLost}`,
    winRatePercent: winRatePercent(input.matchesWon, input.matchesPlayed),
    sinceLabel: year == null ? null : `Since ${year}`,
    sets:
      input.matchesPlayed > 0
        ? `${input.setsWon}–${input.setsLost}`
        : EMPTY_VALUE,
    longestStreak: winStreakLabel(input.longestWinStreak),
    mostPlayedPartner: input.mostPlayedPartnerName
      ? shortPlayerName(input.mostPlayedPartnerName)
      : EMPTY_VALUE,
  };
}
