import { friendlyGameCanKickPlayer } from "./friendly-game-players";
import {
  canOpenOrganizerMergeDrawer,
  defaultMergePositions,
  halfTeamsFromSides,
  samePositionMerge,
  showOrganizerMergeBanner,
  swapMergePositions,
  type HalfTeam,
  type HalfTeamOccupant,
  type MergePositionAssignment,
} from "./tournament-half-teams";
import {
  canOpenOrganizerDrawDrawer,
  canShowUndoPoolDraw,
} from "./tournament-pool-draw";
import { hasPools } from "./tournament-rounds";
import {
  isOneDayTournamentWindow,
  sizeTournamentRounds,
} from "./tournament-schedule";
import {
  oneDayFit,
  roundCountRange,
  resolveRoundCount,
  sizeFriendlyTournament,
} from "./tournament-sizing";

type OrganizerSide = {
  sideIndex: number;
  gameTeamId: string | null;
  left: (HalfTeamOccupant & { userId: string }) | null;
  right: (HalfTeamOccupant & { userId: string }) | null;
};

export type TournamentOrganizerGame = {
  isOrganizer: boolean;
  cancelledAt: Date | null;
  viewerUserId: string;
  canUndoDraw: boolean;
  sides: readonly OrganizerSide[];
};

export type TournamentOrganizerView = {
  active: boolean;
  halfTeams: HalfTeam[];
  merge: "banner" | "entry" | null;
  showDrawEntry: boolean;
  showUndo: boolean;
};

export function tournamentOrganizerView(
  game: TournamentOrganizerGame,
  view: { drawn: boolean; partnerRequired: boolean },
): TournamentOrganizerView {
  const halfTeams = halfTeamsFromSides(game.sides);
  const gate = {
    isOrganizer: game.isOrganizer,
    cancelled: Boolean(game.cancelledAt),
    drawPosted: view.drawn,
  };
  const mergeGate = {
    ...gate,
    halfTeamCount: halfTeams.length,
    partnerRequired: view.partnerRequired,
  };
  return {
    active: game.isOrganizer && !game.cancelledAt,
    halfTeams,
    merge: showOrganizerMergeBanner(mergeGate)
      ? "banner"
      : canOpenOrganizerMergeDrawer(mergeGate)
        ? "entry"
        : null,
    showDrawEntry: canOpenOrganizerDrawDrawer(gate),
    showUndo: canShowUndoPoolDraw({ ...gate, canUndo: game.canUndoDraw }),
  };
}

export function kickableTournamentOccupants(
  game: TournamentOrganizerGame,
): { userId: string; name: string }[] {
  const seen = new Set<string>();
  const occupants: { userId: string; name: string }[] = [];
  for (const row of game.sides) {
    for (const occupant of [row.left, row.right]) {
      if (!occupant || seen.has(occupant.userId)) {
        continue;
      }
      if (
        !friendlyGameCanKickPlayer({
          isOrganizer: game.isOrganizer,
          cancelled: Boolean(game.cancelledAt),
          isViewer: occupant.userId === game.viewerUserId,
        })
      ) {
        continue;
      }
      seen.add(occupant.userId);
      occupants.push({ userId: occupant.userId, name: occupant.name });
    }
  }
  return occupants;
}

export type MergeSelection = {
  first: HalfTeam | null;
  second: HalfTeam | null;
  assignment: MergePositionAssignment | null;
  invalidPair: boolean;
  canMerge: boolean;
};

function halfTeamById(halfTeams: readonly HalfTeam[], gameTeamId: string) {
  return halfTeams.find((team) => team.gameTeamId === gameTeamId) ?? null;
}

export function mergeSelection(args: {
  halfTeams: readonly HalfTeam[];
  firstId: string;
  secondId: string;
  swapped: boolean;
}): MergeSelection {
  const { halfTeams } = args;
  const first = halfTeamById(halfTeams, args.firstId) ?? halfTeams[0] ?? null;
  const selectedSecond = halfTeamById(halfTeams, args.secondId);
  const second =
    selectedSecond && selectedSecond.gameTeamId !== first?.gameTeamId
      ? selectedSecond
      : (halfTeams.find((team) => team.gameTeamId !== first?.gameTeamId) ??
        null);
  const defaults = first ? defaultMergePositions(first) : null;
  const assignment =
    defaults && args.swapped ? swapMergePositions(defaults) : defaults;
  const invalidPair = assignment ? samePositionMerge(assignment) : false;
  return {
    first,
    second,
    assignment,
    invalidPair,
    canMerge: Boolean(first && second && assignment && !invalidPair),
  };
}

export type TournamentRoundsGame = {
  format: string;
  poolCount: number | null;
  drawPostedAt: Date | null;
  teamsAllowed: number | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  recordedCourts: readonly unknown[];
  matchMinutes: number | null;
};

export type TournamentRoundsPlan = {
  poolSizes: readonly number[];
  range: ReturnType<typeof roundCountRange>;
  roundCount: number;
  rounds: ReturnType<typeof sizeTournamentRounds>;
  overruns: boolean;
};

export function tournamentRoundsPlan(
  game: TournamentRoundsGame,
  storedRoundCount: number | null,
): TournamentRoundsPlan | null {
  if (
    !hasPools(game.format, game.poolCount) ||
    game.poolCount == null ||
    game.drawPostedAt
  ) {
    return null;
  }
  const sized = sizeFriendlyTournament(game.teamsAllowed ?? 0, game.poolCount);
  if (!sized.ok) {
    return null;
  }
  const poolSizes = sized.sizing.poolSizes;
  const roundCount = resolveRoundCount(poolSizes, storedRoundCount);
  if (roundCount == null) {
    return null;
  }
  const rounds = sizeTournamentRounds(poolSizes, roundCount);
  const overruns =
    game.windowStart != null &&
    game.windowEnd != null &&
    game.recordedCourts.length > 0 &&
    isOneDayTournamentWindow(game.windowStart, game.windowEnd) &&
    oneDayFit({
      start: game.windowStart,
      finish: game.windowEnd,
      roundMatches: rounds.roundMatches,
      courtCount: game.recordedCourts.length,
      matchMinutes: game.matchMinutes,
    }).overruns;
  return {
    poolSizes,
    range: roundCountRange(poolSizes),
    roundCount,
    rounds,
    overruns,
  };
}
