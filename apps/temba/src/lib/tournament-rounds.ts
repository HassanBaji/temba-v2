import { formatAbsoluteDay } from "~/lib/format-game-start";
import {
  fewWeeksRoundStarts,
  isOneDayTournamentWindow,
} from "~/lib/tournament-schedule";
import {
  sizeFriendlyTournament,
  tournamentMatchMinutes,
} from "~/lib/tournament-sizing";

export function isPoolTournament(
  format: string,
  poolCount: number | null | undefined,
) {
  return format === "friendly_tournament" && poolCount != null;
}

export function showsPoolTournamentSeats(
  format: string,
  poolCount: number | null | undefined,
  registrationMode: string,
) {
  return (
    isPoolTournament(format, poolCount) && registrationMode === "individual"
  );
}

export const PARTNER_REQUIRED_REFUSAL_MESSAGE =
  "This tournament does not allow registering alone";
export const PARTNER_REQUIRED_FULL_MESSAGE = "This tournament is full";

export function isPartnerRequiredGame(game: {
  format: string;
  poolCount: number | null | undefined;
  registrationMode: string;
  allowSoloRegister: boolean;
}) {
  return (
    showsPoolTournamentSeats(
      game.format,
      game.poolCount,
      game.registrationMode,
    ) && game.allowSoloRegister === false
  );
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

function localDayKey(value: Date) {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}

export type TournamentRoundSummary = {
  roundCount: number;
  dateLines: string[];
};

export type TournamentRoundScheduleEntry = {
  roundNumber: number;
  start: Date;
};

export function tournamentRoundSchedule(args: {
  windowStart: Date | string;
  windowEnd: Date | string;
  roundCount: number;
  matchMinutes: number | null;
}): TournamentRoundScheduleEntry[] {
  if (args.roundCount < 1) {
    return [];
  }

  const windowStart = asDate(args.windowStart);
  const windowEnd = asDate(args.windowEnd);
  const starts = isOneDayTournamentWindow(windowStart, windowEnd)
    ? oneDayRoundStarts(windowStart, args.roundCount, args.matchMinutes)
    : fewWeeksRoundStarts(
        windowStart,
        windowEnd,
        args.roundCount,
        args.matchMinutes,
      );

  return starts.map((start, index) => ({
    roundNumber: index + 1,
    start,
  }));
}

function oneDayRoundStarts(
  windowStart: Date,
  roundCount: number,
  matchMinutes: number | null,
): Date[] {
  const minutes = tournamentMatchMinutes(matchMinutes);
  return Array.from(
    { length: roundCount },
    (_, index) => new Date(windowStart.getTime() + index * minutes * 60 * 1000),
  );
}

export function poolRoundLabel(
  roundNumber: number | null | undefined,
  roundCount: number | null | undefined,
) {
  if (roundNumber == null || roundCount == null) {
    return null;
  }
  return `R${roundNumber} of ${roundCount}`;
}

export type RoundsPlayedMatch = {
  roundNumber: number | null;
  cancelled?: boolean;
  status?: string | null;
};

export type RoundsPlayedPoolTables = {
  pools: readonly { matches: readonly RoundsPlayedMatch[] }[];
};

export function roundsPlayedLabel(
  poolTables: RoundsPlayedPoolTables | null | undefined,
  roundCount: number | null | undefined,
): string | null {
  if (poolTables == null || roundCount == null || roundCount < 1) {
    return null;
  }

  const byRound = new Map<number, RoundsPlayedMatch[]>();
  for (const pool of poolTables.pools) {
    for (const match of pool.matches) {
      if (match.roundNumber == null) {
        continue;
      }
      const list = byRound.get(match.roundNumber) ?? [];
      list.push(match);
      byRound.set(match.roundNumber, list);
    }
  }

  let played = 0;
  for (const matches of byRound.values()) {
    if (matches.length > 0 && matches.every(isSettledRoundMatch)) {
      played += 1;
    }
  }

  return `Round ${played} of ${roundCount} played`;
}

function isSettledRoundMatch(match: RoundsPlayedMatch) {
  return (
    match.cancelled === true ||
    match.status === "completed" ||
    match.status === "cancelled"
  );
}

export function tournamentRoundSummary(args: {
  poolCount: number | null | undefined;
  teamCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
}): TournamentRoundSummary | null {
  if (args.poolCount == null || args.teamCount == null) {
    return null;
  }
  const sized = sizeFriendlyTournament(args.teamCount, args.poolCount);
  if (!sized.ok) {
    return null;
  }

  const dateLines: string[] = [];
  if (args.windowStart) {
    const start = asDate(args.windowStart);
    dateLines.push(formatAbsoluteDay(start));
    if (args.windowEnd) {
      const end = asDate(args.windowEnd);
      if (localDayKey(end) !== localDayKey(start)) {
        dateLines.push(formatAbsoluteDay(end));
      }
    }
  }

  return {
    roundCount: sized.sizing.roundCount,
    dateLines,
  };
}
