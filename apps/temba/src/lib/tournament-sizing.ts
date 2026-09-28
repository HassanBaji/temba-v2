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

export const ONE_DAY_OVERRUN_MESSAGE =
  "This runs past your finish time. Add a Court, or take fewer Game teams.";

export const CREATE_TOURNAMENT_HEADING_LEAD = "New tournament,";
export const CREATE_TOURNAMENT_HEADING_TRAIL = "several Rounds";
export const CREATE_TOURNAMENT_HEADING = `${CREATE_TOURNAMENT_HEADING_LEAD} ${CREATE_TOURNAMENT_HEADING_TRAIL}`;
export const CREATE_SUBLINE =
  "Same as setting up a Friendly game, only it runs a few Rounds.";
export const CREATE_FOOTER_COPY =
  "It shows up in Games like any other Game. You draw once the seats are full.";
export const UNEVEN_POOLS_COPY =
  "Groups are uneven. Some Game teams play one more Match than others.";
export const POOL_MATCHES_ROW_LABEL = "group Matches";
export const MATCHES_PER_TEAM_ROW_LABEL = "Matches per Game team";
export const EACH_MATCH_ROW_LABEL = "Each Match";
export const COURTS_ROW_LABEL = "Courts";
export const ONE_DAY_CALLOUT_LABEL = "The day";
export const CREATE_PRIMARY_ACTION = "Create tournament";
export const HOW_LONG_IT_RUNS_LABEL = "How long it runs";
export const ONE_DAY_DURATION_LABEL = "One day";
export const FEW_WEEKS_DURATION_LABEL = "A few weeks";
export const WHO_CAN_TAKE_A_SEAT_LABEL = "Who can take a seat";
export const THIS_GROUP_ONLY_LABEL = "This Group only";
export const ANYONE_WITH_THE_LINK_LABEL = "Anyone with the link";
export const HOW_PEOPLE_JOIN_LABEL = "How people join";
export const ALONE_OR_WITH_A_PARTNER_LABEL = "Alone or with a partner";
export const WITH_A_PARTNER_ONLY_LABEL = "With a partner only";
export const LAST_MATCH_FINISH_PREFIX = "The last Match would finish at";

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
): number {
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

export function oneDayFit(input: {
  start: Date;
  finish: Date;
  poolMatches: number;
  courtCount: number;
  matchMinutes: number | null;
}): OneDayFit {
  if (input.courtCount < 1) {
    return { slotCount: null, lastFinish: null, overruns: true };
  }

  const slotCount = Math.ceil(input.poolMatches / input.courtCount);
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

export function formatPoolSizeLine(sizing: TournamentSizing) {
  const counts = new Map<number, number>();
  for (const size of sizing.poolSizes) {
    counts.set(size, (counts.get(size) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(
      ([size, count]) =>
        `${count} ${count === 1 ? "group" : "groups"} of ${size}`,
    )
    .join(", ");
}

export function formatMatchesPerTeam(sizing: TournamentSizing) {
  if (sizing.matchesPerTeamMin === sizing.matchesPerTeamMax) {
    return `Each Game team plays ${sizing.matchesPerTeamMin} Matches`;
  }
  return `Game teams in a larger group play ${sizing.matchesPerTeamMax} Matches; Game teams in a smaller group play ${sizing.matchesPerTeamMin} Matches`;
}

export function playersInPairsLine(teamCount: number) {
  return `${teamCount * 2} players in pairs. Two seats per team.`;
}

export function courtCountValue(courtCount: number) {
  if (courtCount === 0) {
    return "None";
  }
  return courtCount === 1 ? "1 Court" : `${courtCount} Courts`;
}

export function lastMatchFinishCopy(clock: string) {
  return `${LAST_MATCH_FINISH_PREFIX} ${clock}.`;
}

export type RoundMeets = "once" | "partial" | "twice" | "somePartialSecond";

export const ROUND_MEETS_COPY: Record<RoundMeets, string> = {
  once: "Everyone meets once",
  partial: "Not everyone meets",
  twice: "Everyone meets twice",
  somePartialSecond: "Some meet twice",
};

export const ROUNDS_LABEL = "Rounds";
export const SUGGESTED_ROUNDS_TAG = "Suggested";

export function suggestedRoundsResetLabel(suggested: number) {
  return `Use suggested (${suggested})`;
}

export function roundCountLabel(roundCount: number) {
  return roundCount === 1 ? "1 Round" : `${roundCount} Rounds`;
}

export function reviewRoundsValue(roundCount: number, suggested: number) {
  const label = roundCountLabel(roundCount);
  return roundCount === suggested ? `${label} · suggested` : label;
}

export function formatRoundMatchesPerTeam(range: {
  matchesPerTeamMin: number;
  matchesPerTeamMax: number;
}) {
  const { matchesPerTeamMin: min, matchesPerTeamMax: max } = range;
  if (min === max) {
    return `Each Game team plays ${min} ${min === 1 ? "Match" : "Matches"}`;
  }
  return `Each Game team plays ${min} to ${max} Matches`;
}
