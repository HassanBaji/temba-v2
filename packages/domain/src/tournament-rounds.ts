import { formatAbsoluteDay } from "./format-game-start";
import { productDayKey } from "./product-timezone";
import {
  fewWeeksRoundStarts,
  isOneDayTournamentWindow,
} from "./tournament-schedule";
import {
  buildKnockoutTree,
  buildPoolKnockoutTree,
} from "./tournament-knockout";
import {
  clampQualifiersPerPool,
  DEFAULT_QUALIFIERS_PER_POOL,
  resolvePlannedRoundCount,
  sizeFriendlyTournament,
  tournamentMatchMinutes,
} from "./tournament-sizing";

export type TournamentShape =
  | "groups_only"
  | "groups_then_knockout"
  | "knockout_only";

export const KNOCKOUT_ONLY_SHAPE = "knockout_only" satisfies TournamentShape;

/**
 * A Friendly tournament whose Matches come from the draw, in any Tournament
 * shape. A legacy hand-built tournament has neither a Pool count nor a shape.
 */
export function isDrawnTournament(
  format: string,
  poolCount: number | null | undefined,
  tournamentShape: string | null | undefined,
) {
  return (
    format === "friendly_tournament" &&
    (poolCount != null || tournamentShape != null)
  );
}

/** A drawn tournament with a Pool stage: Groups only, or Groups then knockout. */
export function hasPools(format: string, poolCount: number | null | undefined) {
  return format === "friendly_tournament" && poolCount != null;
}

export function isKnockoutOnly(
  format: string,
  tournamentShape: string | null | undefined,
) {
  return (
    format === "friendly_tournament" && tournamentShape === KNOCKOUT_ONLY_SHAPE
  );
}

export function hasKnockout(
  format: string,
  tournamentShape: string | null | undefined,
) {
  return (
    format === "friendly_tournament" &&
    (tournamentShape === KNOCKOUT_ONLY_SHAPE ||
      tournamentShape === "groups_then_knockout")
  );
}

/** Pool Rounds then Knockout rounds, before the draw is posted. */
export function plannedTournamentRoundCount(game: {
  format: string;
  teamsAllowed: number | null | undefined;
  poolCount: number | null | undefined;
  roundCount: number | null | undefined;
  tournamentShape: string | null | undefined;
}): number | null {
  if (isKnockoutOnly(game.format, game.tournamentShape)) {
    return game.teamsAllowed == null
      ? null
      : (buildKnockoutTree({ entrantCount: game.teamsAllowed })?.roundCount ??
          null);
  }
  return resolvePlannedRoundCount(
    game.teamsAllowed,
    game.poolCount,
    game.roundCount,
  );
}

/** Knockout rounds the tree will have, before the draw is posted. */
export function plannedKnockoutRoundCount(game: {
  format: string;
  teamsAllowed: number | null | undefined;
  poolCount: number | null | undefined;
  tournamentShape: string | null | undefined;
  qualifiersPerPool: number | null | undefined;
}): number | null {
  if (!hasKnockout(game.format, game.tournamentShape)) {
    return null;
  }
  if (game.teamsAllowed == null) {
    return null;
  }
  if (isKnockoutOnly(game.format, game.tournamentShape)) {
    return (
      buildKnockoutTree({ entrantCount: game.teamsAllowed })?.roundCount ?? null
    );
  }
  if (game.poolCount == null) {
    return null;
  }
  const sized = sizeFriendlyTournament(game.teamsAllowed, game.poolCount);
  if (!sized.ok) {
    return null;
  }
  const qualifiersPerPool = clampQualifiersPerPool(
    sized.sizing.poolSizes,
    game.qualifiersPerPool ?? DEFAULT_QUALIFIERS_PER_POOL,
  );
  if (qualifiersPerPool == null) {
    return null;
  }
  return (
    buildPoolKnockoutTree({ poolCount: game.poolCount, qualifiersPerPool })
      ?.roundCount ?? null
  );
}

export function showsDrawnTournamentSeats(
  format: string,
  poolCount: number | null | undefined,
  tournamentShape: string | null | undefined,
  registrationMode: string,
) {
  return (
    isDrawnTournament(format, poolCount, tournamentShape) &&
    registrationMode === "individual"
  );
}

export const PARTNER_REQUIRED_REFUSAL_MESSAGE =
  "This tournament does not allow registering alone";
export const PARTNER_REQUIRED_FULL_MESSAGE = "This tournament is full";

export function isPartnerRequiredGame(game: {
  format: string;
  poolCount: number | null | undefined;
  tournamentShape: string | null | undefined;
  registrationMode: string;
  allowSoloRegister: boolean;
}) {
  return (
    showsDrawnTournamentSeats(
      game.format,
      game.poolCount,
      game.tournamentShape,
      game.registrationMode,
    ) && game.allowSoloRegister === false
  );
}

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
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

/**
 * Pool Rounds only, so `round_count` keeps meaning Pool Rounds. A Knockout
 * only tournament has no Pool Matches, so its Rounds are its Knockout rounds.
 */
export function postedRoundCount(
  matches: readonly {
    roundNumber: number | null;
    knockoutRound: number | null;
  }[],
): number | null {
  const poolMatches = matches.filter((match) => match.knockoutRound == null);
  const counted = poolMatches.length > 0 ? poolMatches : matches;
  let max = 0;
  for (const match of counted) {
    if (match.roundNumber != null && match.roundNumber > max) {
      max = match.roundNumber;
    }
  }
  return max > 0 ? max : null;
}

export function tournamentRoundSummary(args: {
  roundCount: number | null;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  matchMinutes: number | null;
}): TournamentRoundSummary | null {
  if (args.roundCount == null) {
    return null;
  }
  return {
    roundCount: args.roundCount,
    dateLines: roundDateLines({ ...args, roundCount: args.roundCount }),
  };
}

function roundDateLines(args: {
  roundCount: number;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  matchMinutes: number | null;
}): string[] {
  if (!args.windowStart) {
    return [];
  }
  if (!args.windowEnd) {
    return [formatAbsoluteDay(asDate(args.windowStart))];
  }
  const schedule = tournamentRoundSchedule({
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    roundCount: args.roundCount,
    matchMinutes: args.matchMinutes,
  });
  const first = schedule[0]?.start ?? asDate(args.windowStart);
  const last = schedule[schedule.length - 1]?.start ?? first;
  return productDayKey(last) === productDayKey(first)
    ? [formatAbsoluteDay(first)]
    : [formatAbsoluteDay(first), formatAbsoluteDay(last)];
}
