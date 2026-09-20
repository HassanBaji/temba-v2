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
export const DRAW_DRAWER_TITLE = "The draw";
export const DRAW_ENTRY_TITLE = "The Pool draw";
export const DRAW_ENTRY_DRAFTED_TITLE = "The Pools are drafted";
export const DRAW_ENTRY_ACTION_LABEL = "Open the draw";
export const DRAW_EMPTY_DRAFT_COPY =
  "Draw the Pools to see which Game teams land in which Pool.";
export const POST_POOL_DRAW_FOOTER_COPY =
  "Posting creates every Pool Match and closes the seats.";

export function poolLabel(poolIndex: number) {
  return `Pool ${poolIndex}`;
}

export function hasDraftPoolDraw(
  gameTeams: readonly { poolIndex: number | null | undefined }[],
) {
  return gameTeams.some((team) => team.poolIndex != null);
}

export function canOpenOrganizerDrawDrawer(args: {
  isOrganizer: boolean;
  cancelled: boolean;
  drawPosted: boolean;
}) {
  return args.isOrganizer && !args.cancelled && !args.drawPosted;
}

export function canShowUndoPoolDraw(args: {
  isOrganizer: boolean;
  cancelled: boolean;
  drawPosted: boolean;
}) {
  return args.isOrganizer && !args.cancelled && args.drawPosted;
}

export function drawEntryTitle(hasDraft: boolean) {
  return hasDraft ? DRAW_ENTRY_DRAFTED_TITLE : DRAW_ENTRY_TITLE;
}

export function drawEntryStateLine(completeTeams: number, teamCount: number) {
  const teamWord = teamCount === 1 ? "Game team" : "Game teams";
  const verb = teamCount === 1 ? "is" : "are";
  return `${completeTeams} of ${teamCount} ${teamWord} ${verb} complete.`;
}

export function drawDrawerLead(teamCount: number | null | undefined) {
  if (teamCount == null || teamCount <= 0) {
    return POOL_DRAW_RANDOM_COPY;
  }
  const teamWord = teamCount === 1 ? "Game team" : "Game teams";
  return `${teamCount} ${teamWord}. ${POOL_DRAW_RANDOM_COPY}`;
}

export function draftPoolMetaLine(args: {
  dateLines: readonly string[];
  courtNames: readonly string[];
}) {
  const parts = [...args.dateLines];
  const courts = args.courtNames.filter((name) => name.trim().length > 0);
  if (courts.length > 0) {
    parts.push(courts.join(", "));
  }
  return parts.join(", ");
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
