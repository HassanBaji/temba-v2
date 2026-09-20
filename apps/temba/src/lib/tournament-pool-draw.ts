import { tournamentRoundSummary } from "~/lib/tournament-rounds";

function gameTeamName(team: {
  name: string | null;
  members: readonly { name: string }[];
}) {
  if (team.members.length > 0) {
    return team.members.map((member) => member.name).join(" / ");
  }
  return team.name ?? "Game team";
}

export const POOL_DRAW_NOT_HAPPENED_COPY =
  "The Pool draw has not happened yet.";
export const OPPONENTS_UNKNOWN_COPY = "Your opponents are not yet known.";
export const POOL_DRAW_RANDOM_COPY =
  "The Pool draw is random. Nobody is seeded.";
export const DRAW_POOLS_ACTION = "Draw the Pools";
export const DRAW_AGAIN_ACTION = "Draw again";
export const POST_POOL_DRAW_ACTION = "Post the Pool draw";
export const UNDO_POOL_DRAW_ACTION = "Undo the Pool draw";

export function poolLabel(poolIndex: number) {
  return `Pool ${poolIndex}`;
}

export function hasDraftPoolDraw(
  gameTeams: readonly { poolIndex: number | null | undefined }[],
) {
  return gameTeams.some((team) => team.poolIndex != null);
}

export type DraftPoolTeam = {
  id: string;
  name: string | null;
  sideIndex: number | null;
  poolIndex: number | null;
  members: readonly { name: string }[];
};

export type DraftPoolView = {
  poolIndex: number;
  label: string;
  teams: { id: string; name: string }[];
  dateLines: string[];
  courtNames: string[];
};

export function draftPoolsFromGameTeams(args: {
  gameTeams: readonly DraftPoolTeam[];
  poolCount: number | null | undefined;
  teamCount: number | null | undefined;
  windowStart: Date | string | null | undefined;
  windowEnd: Date | string | null | undefined;
  courtNames: readonly string[];
}): DraftPoolView[] {
  const byPool = new Map<number, DraftPoolTeam[]>();
  for (const team of args.gameTeams) {
    if (team.poolIndex == null) {
      continue;
    }
    const list = byPool.get(team.poolIndex) ?? [];
    list.push(team);
    byPool.set(team.poolIndex, list);
  }

  const rounds = tournamentRoundSummary({
    poolCount: args.poolCount,
    teamCount: args.teamCount,
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
  });
  const dateLines = rounds?.dateLines ?? [];
  const courtNames = [...args.courtNames];

  return [...byPool.entries()]
    .sort(([left], [right]) => left - right)
    .map(([poolIndex, teams]) => ({
      poolIndex,
      label: poolLabel(poolIndex),
      teams: [...teams]
        .sort((left, right) => {
          const leftSide = left.sideIndex ?? Number.MAX_SAFE_INTEGER;
          const rightSide = right.sideIndex ?? Number.MAX_SAFE_INTEGER;
          if (leftSide !== rightSide) {
            return leftSide - rightSide;
          }
          return left.id.localeCompare(right.id);
        })
        .map((team) => ({
          id: team.id,
          name: gameTeamName(team),
        })),
      dateLines,
      courtNames,
    }));
}
