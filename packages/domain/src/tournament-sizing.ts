import { messagesFor } from "@repo/i18n/messages";
import type { Locale } from "@repo/i18n/locale";

export const TOURNAMENT_TEAM_MIN = 4;
export const TOURNAMENT_TEAM_MAX = 32;
export const TOURNAMENT_TEAM_STEP = 2;
export const TOURNAMENT_DEFAULT_TEAM_COUNT = 12;
export const TOURNAMENT_DEFAULT_POOL_COUNT = 3;
export const TOURNAMENT_SLOT_MINUTES = 45;

export function tournamentMatchMinutes(
  matchMinutes: number | null | undefined,
) {
  return matchMinutes ?? TOURNAMENT_SLOT_MINUTES;
}

export const TOURNAMENT_TEAM_COUNTS: readonly number[] = Array.from(
  {
    length:
      (TOURNAMENT_TEAM_MAX - TOURNAMENT_TEAM_MIN) / TOURNAMENT_TEAM_STEP + 1,
  },
  (_, index) => TOURNAMENT_TEAM_MIN + index * TOURNAMENT_TEAM_STEP,
);

export type TournamentSizing = {
  teamCount: number;
  poolCount: number;
  poolSizes: number[];
  uneven: boolean;
  poolMatches: number;
  matchesPerTeamMin: number;
  matchesPerTeamMax: number;
  roundCount: number;
  playerCount: number;
};

export type TournamentSizingIssue = {
  path: "teamCount" | "poolCount";
  message: string;
};

export type TournamentSizingResult =
  | { ok: true; sizing: TournamentSizing }
  | { ok: false; issue: TournamentSizingIssue };

export function maxPoolCount(teamCount: number): number {
  if (!Number.isInteger(teamCount) || teamCount < 1) {
    return 1;
  }
  return Math.max(1, Math.floor(teamCount / 3));
}

export function defaultPoolCount(teamCount: number): number {
  return Math.min(TOURNAMENT_DEFAULT_POOL_COUNT, maxPoolCount(teamCount));
}

export function poolCountOptions(teamCount: number): number[] {
  const max = maxPoolCount(teamCount);
  return Array.from({ length: max }, (_, index) => index + 1);
}

export function poolCountForDrawnField(
  completeTeamCount: number,
  requestedPoolCount: number,
): number {
  return Math.min(requestedPoolCount, maxPoolCount(completeTeamCount));
}

export function balancedPoolSizes(
  teamCount: number,
  poolCount: number,
): number[] {
  const base = Math.floor(teamCount / poolCount);
  const extra = teamCount % poolCount;
  return Array.from({ length: poolCount }, (_, index) =>
    index < extra ? base + 1 : base,
  );
}

function roundRobinMatches(poolSize: number): number {
  return (poolSize * (poolSize - 1)) / 2;
}

export const MAX_PASSES = 2;

export function poolPassLength(poolSize: number): number {
  return poolSize % 2 === 0 ? poolSize - 1 : poolSize;
}

export function suggestedRoundCount(poolSizes: readonly number[]): number {
  if (poolSizes.length === 0) {
    return 0;
  }
  return poolPassLength(Math.max(...poolSizes));
}

export function roundCountRange(poolSizes: readonly number[]) {
  const suggested = suggestedRoundCount(poolSizes);
  return { min: 1, max: MAX_PASSES * suggested, suggested };
}

export function resolveRoundCount(
  poolSizes: readonly number[],
  storedRoundCount: number | null | undefined,
): number | null {
  if (poolSizes.length === 0) {
    return null;
  }
  const range = roundCountRange(poolSizes);
  if (storedRoundCount == null) {
    return range.suggested;
  }
  return Math.min(storedRoundCount, range.max);
}

export function resolvePlannedRoundCount(
  teamCount: number | null | undefined,
  poolCount: number | null | undefined,
  storedRoundCount: number | null | undefined,
): number | null {
  if (teamCount == null || poolCount == null) {
    return null;
  }
  const sized = sizeFriendlyTournament(teamCount, poolCount);
  return sized.ok
    ? resolveRoundCount(sized.sizing.poolSizes, storedRoundCount)
    : null;
}

export type RoundCountValidation =
  | { ok: true; roundCount: number | null }
  | { ok: false; issue: { path: "roundCount"; message: string } };

export function validateRoundCount(
  poolSizes: readonly number[],
  roundCount: number | null | undefined,
): RoundCountValidation {
  if (roundCount == null) {
    return { ok: true, roundCount: null };
  }
  const range = roundCountRange(poolSizes);
  if (
    !Number.isInteger(roundCount) ||
    roundCount < range.min ||
    roundCount > range.max
  ) {
    return {
      ok: false,
      issue: {
        path: "roundCount",
        message: `Rounds must be between ${range.min} and ${range.max}`,
      },
    };
  }
  return {
    ok: true,
    roundCount: roundCount === range.suggested ? null : roundCount,
  };
}

export const DEFAULT_QUALIFIERS_PER_POOL = 2;

export type QualifiersPerPoolRange = { min: number; max: number };

/** A single Pool sends at least two, so the Knockout always has a Final. */
export function qualifiersPerPoolRange(
  poolSizes: readonly number[],
): QualifiersPerPoolRange | null {
  if (poolSizes.length === 0) {
    return null;
  }
  const min = poolSizes.length === 1 ? 2 : 1;
  const max = Math.min(...poolSizes) - 1;
  return max >= min ? { min, max } : null;
}

export function clampQualifiersPerPool(
  poolSizes: readonly number[],
  qualifiersPerPool: number,
): number | null {
  const range = qualifiersPerPoolRange(poolSizes);
  if (!range) {
    return null;
  }
  return Math.min(Math.max(qualifiersPerPool, range.min), range.max);
}

export function defaultQualifiersPerPool(
  poolSizes: readonly number[],
): number | null {
  return clampQualifiersPerPool(poolSizes, DEFAULT_QUALIFIERS_PER_POOL);
}

export type QualifiersPerPoolValidation =
  | { ok: true; qualifiersPerPool: number }
  | { ok: false; issue: { path: "qualifiersPerPool"; message: string } };

export function validateQualifiersPerPool(
  poolSizes: readonly number[],
  qualifiersPerPool: number | null | undefined,
): QualifiersPerPoolValidation {
  const range = qualifiersPerPoolRange(poolSizes);
  if (!range) {
    return {
      ok: false,
      issue: {
        path: "qualifiersPerPool",
        message: "These groups are too small for a knockout",
      },
    };
  }
  if (qualifiersPerPool == null) {
    return {
      ok: true,
      qualifiersPerPool: defaultQualifiersPerPool(poolSizes) ?? range.max,
    };
  }
  if (
    !Number.isInteger(qualifiersPerPool) ||
    qualifiersPerPool < range.min ||
    qualifiersPerPool > range.max
  ) {
    return {
      ok: false,
      issue: {
        path: "qualifiersPerPool",
        message: `Through from each group must be between ${range.min} and ${range.max}`,
      },
    };
  }
  return { ok: true, qualifiersPerPool };
}

/**
 * The Organizer's number capped by the drawn Pools, never rewritten
 * (mirrors the Round count, ADR-0019), so a short field still posts.
 */
export function resolveQualifiersPerPool(
  drawnPoolSizes: readonly number[],
  storedQualifiersPerPool: number | null | undefined,
): number | null {
  if (drawnPoolSizes.length === 0) {
    return null;
  }
  const cap = Math.min(...drawnPoolSizes) - 1;
  const resolved = Math.min(
    storedQualifiersPerPool ?? DEFAULT_QUALIFIERS_PER_POOL,
    cap,
  );
  return resolved >= 1 && resolved * drawnPoolSizes.length >= 2
    ? resolved
    : null;
}

export function tournamentTeamCountIssue(
  teamCount: number,
): TournamentSizingIssue | null {
  if (
    !Number.isInteger(teamCount) ||
    teamCount < TOURNAMENT_TEAM_MIN ||
    teamCount > TOURNAMENT_TEAM_MAX
  ) {
    return {
      path: "teamCount",
      message: `Game team count must be between ${TOURNAMENT_TEAM_MIN} and ${TOURNAMENT_TEAM_MAX}`,
    };
  }
  if (teamCount % TOURNAMENT_TEAM_STEP !== 0) {
    return {
      path: "teamCount",
      message: "Game team count must be even",
    };
  }
  return null;
}

export function sizeFriendlyTournament(
  teamCount: number,
  poolCount: number,
): TournamentSizingResult {
  const teamCountIssue = tournamentTeamCountIssue(teamCount);
  if (teamCountIssue) {
    return { ok: false, issue: teamCountIssue };
  }

  const maxPools = maxPoolCount(teamCount);
  if (!Number.isInteger(poolCount) || poolCount < 1 || poolCount > maxPools) {
    return {
      ok: false,
      issue: {
        path: "poolCount",
        message: `groups count must be between 1 and ${maxPools} for ${teamCount} Game teams`,
      },
    };
  }

  const poolSizes = balancedPoolSizes(teamCount, poolCount);
  const maxPoolSize = Math.max(...poolSizes);
  const matchesPerTeam = poolSizes.map((size) => size - 1);

  return {
    ok: true,
    sizing: {
      teamCount,
      poolCount,
      poolSizes,
      uneven: new Set(poolSizes).size > 1,
      poolMatches: poolSizes.reduce(
        (total, size) => total + roundRobinMatches(size),
        0,
      ),
      matchesPerTeamMin: Math.min(...matchesPerTeam),
      matchesPerTeamMax: Math.max(...matchesPerTeam),
      roundCount: poolPassLength(maxPoolSize),
      playerCount: teamCount * 2,
    },
  };
}

export type OneDayFit = {
  slotCount: number | null;
  lastFinish: Date | null;
  overruns: boolean;
};

// Rounds run back to back and a Round only starts once the last one has
// cleared the Courts, so each Round rounds up to whole slots on its own.
export function oneDayFit(input: {
  start: Date;
  finish: Date;
  roundMatches: readonly number[];
  courtCount: number;
  matchMinutes: number | null;
}): OneDayFit {
  if (input.courtCount < 1) {
    return { slotCount: null, lastFinish: null, overruns: true };
  }

  const slotCount = input.roundMatches.reduce(
    (total, matches) => total + Math.ceil(matches / input.courtCount),
    0,
  );
  const minutes = tournamentMatchMinutes(input.matchMinutes);
  const lastFinish = new Date(
    input.start.getTime() + slotCount * minutes * 60 * 1000,
  );
  return {
    slotCount,
    lastFinish,
    overruns: lastFinish.getTime() > input.finish.getTime(),
  };
}

export function formatPoolSizeLine(sizing: TournamentSizing, locale: Locale) {
  const m = messagesFor(locale).tournament;
  const counts = new Map<number, number>();
  for (const size of sizing.poolSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([size, count]) => m.sizing.poolSizeClause(count, size))
    .join(m.listSeparator);
}

export function formatMatchesPerTeam(sizing: TournamentSizing, locale: Locale) {
  const m = messagesFor(locale).tournament.sizing;
  if (sizing.matchesPerTeamMin === sizing.matchesPerTeamMax) {
    return m.eachTeamPlays(sizing.matchesPerTeamMin);
  }
  return m.unevenMatchesPerTeam(
    sizing.matchesPerTeamMax,
    sizing.matchesPerTeamMin,
  );
}

export function playersInPairsLine(teamCount: number, locale: Locale) {
  return messagesFor(locale).tournament.sizing.playersInPairs(teamCount * 2);
}

export function courtCountValue(courtCount: number, locale: Locale) {
  const m = messagesFor(locale);
  if (courtCount === 0) {
    return m.common.none;
  }
  return m.tournament.sizing.courtCount(courtCount);
}

export function lastMatchFinishCopy(clock: string, locale: Locale) {
  return messagesFor(locale).tournament.sizing.lastMatchFinish(clock);
}

export type RoundMeets = "once" | "partial" | "twice" | "somePartialSecond";

export function roundMeetsCopy(meets: RoundMeets, locale: Locale) {
  return messagesFor(locale).tournament.sizing.roundMeets[meets];
}

export function suggestedRoundsResetLabel(suggested: number, locale: Locale) {
  return messagesFor(locale).tournament.sizing.useSuggested(suggested);
}

export function roundCountLabel(roundCount: number, locale: Locale) {
  return messagesFor(locale).tournament.sizing.roundCount(roundCount);
}

export function reviewRoundsValue(
  roundCount: number,
  suggested: number,
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.sizing;
  return roundCount === suggested
    ? m.roundCountSuggested(roundCount)
    : m.roundCount(roundCount);
}

export function formatRoundMatchesPerTeam(
  range: {
    matchesPerTeamMin: number;
    matchesPerTeamMax: number;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).tournament.sizing;
  const { matchesPerTeamMin: min, matchesPerTeamMax: max } = range;
  if (min === max) {
    return m.eachTeamPlays(min);
  }
  return m.eachTeamPlaysRange(min, max);
}
