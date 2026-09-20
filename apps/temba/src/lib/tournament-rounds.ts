import { formatAbsoluteDay } from "~/lib/format-game-start";
import { sizeFriendlyTournament } from "~/lib/tournament-sizing";

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

export function poolRoundLabel(
  roundNumber: number | null | undefined,
  roundCount: number | null | undefined,
) {
  if (roundNumber == null || roundCount == null) {
    return null;
  }
  return `R${roundNumber} of ${roundCount}`;
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
