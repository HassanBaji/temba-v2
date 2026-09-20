export const TOURNAMENT_TEAM_MIN = 4;
export const TOURNAMENT_TEAM_MAX = 32;
export const TOURNAMENT_TEAM_STEP = 2;
export const TOURNAMENT_DEFAULT_TEAM_COUNT = 12;
export const TOURNAMENT_DEFAULT_POOL_COUNT = 3;
export const TOURNAMENT_SLOT_MINUTES = 45;

export const ONE_DAY_OVERRUN_MESSAGE =
  "This runs past your finish time. Add a Court, or take fewer Game teams.";

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

function poolSizesFor(teamCount: number, poolCount: number): number[] {
  const base = Math.floor(teamCount / poolCount);
  const extra = teamCount % poolCount;
  return Array.from({ length: poolCount }, (_, index) =>
    index < extra ? base + 1 : base,
  );
}

function roundRobinMatches(poolSize: number): number {
  return (poolSize * (poolSize - 1)) / 2;
}

export function sizeFriendlyTournament(
  teamCount: number,
  poolCount: number,
): TournamentSizingResult {
  if (
    !Number.isInteger(teamCount) ||
    teamCount < TOURNAMENT_TEAM_MIN ||
    teamCount > TOURNAMENT_TEAM_MAX
  ) {
    return {
      ok: false,
      issue: {
        path: "teamCount",
        message: `Game team count must be between ${TOURNAMENT_TEAM_MIN} and ${TOURNAMENT_TEAM_MAX}`,
      },
    };
  }
  if (teamCount % TOURNAMENT_TEAM_STEP !== 0) {
    return {
      ok: false,
      issue: {
        path: "teamCount",
        message: "Game team count must be even",
      },
    };
  }

  const maxPools = maxPoolCount(teamCount);
  if (!Number.isInteger(poolCount) || poolCount < 1 || poolCount > maxPools) {
    return {
      ok: false,
      issue: {
        path: "poolCount",
        message: `Pool count must be between 1 and ${maxPools} for ${teamCount} Game teams`,
      },
    };
  }

  const poolSizes = poolSizesFor(teamCount, poolCount);
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
      roundCount: maxPoolSize % 2 === 0 ? maxPoolSize - 1 : maxPoolSize,
      playerCount: teamCount * 2,
    },
  };
}

export type OneDayFit = {
  slotCount: number | null;
  lastFinish: Date | null;
  overruns: boolean;
};

export function oneDayFit(input: {
  start: Date;
  finish: Date;
  poolMatches: number;
  courtCount: number;
}): OneDayFit {
  if (input.courtCount < 1) {
    return { slotCount: null, lastFinish: null, overruns: true };
  }

  const slotCount = Math.ceil(input.poolMatches / input.courtCount);
  const lastFinish = new Date(
    input.start.getTime() + slotCount * TOURNAMENT_SLOT_MINUTES * 60 * 1000,
  );
  return {
    slotCount,
    lastFinish,
    overruns: lastFinish.getTime() > input.finish.getTime(),
  };
}
