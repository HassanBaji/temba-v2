import { isTournamentStandingsView } from "./tournament-home";
import { sizeTournamentRounds } from "./tournament-schedule";
import { resolveRoundCount, sizeFriendlyTournament } from "./tournament-sizing";

export function viewerTournamentTotalFils(
  pricePerPlayerFils: number | null | undefined,
  matchesForViewerPool: number,
): number | null {
  if (pricePerPlayerFils == null) {
    return null;
  }
  if (!Number.isInteger(matchesForViewerPool) || matchesForViewerPool < 0) {
    return null;
  }
  return pricePerPlayerFils * matchesForViewerPool;
}

type ViewerTournamentGame = {
  viewerUserId: string;
  teamsAllowed: number | null | undefined;
  poolCount: number | null | undefined;
  roundCount: number | null | undefined;
  drawPostedAt: Date | string | null | undefined;
  gameTeams: readonly { id: string; members: readonly { id: string }[] }[];
  matches: readonly {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
  }[];
};

export function viewerTournamentMatchCount(
  game: ViewerTournamentGame,
): number | null {
  if (isTournamentStandingsView(game.drawPostedAt)) {
    return postedMatchCountForViewer(game);
  }
  if (game.teamsAllowed == null || game.poolCount == null) {
    return null;
  }
  const sized = sizeFriendlyTournament(game.teamsAllowed, game.poolCount);
  if (!sized.ok) {
    return null;
  }
  const { poolSizes } = sized.sizing;
  const roundCount = resolveRoundCount(poolSizes, game.roundCount);
  if (roundCount == null) {
    return null;
  }
  const rounds = sizeTournamentRounds(poolSizes, roundCount);
  return rounds.matchesPerTeamMin === rounds.matchesPerTeamMax
    ? rounds.matchesPerTeamMin
    : null;
}

function postedMatchCountForViewer(
  game: Pick<ViewerTournamentGame, "viewerUserId" | "gameTeams" | "matches">,
): number | null {
  const viewerTeam = game.gameTeams.find((team) =>
    team.members.some((member) => member.id === game.viewerUserId),
  );
  if (!viewerTeam) {
    return null;
  }
  const count = game.matches.filter(
    (match) =>
      match.slot1GameTeamId === viewerTeam.id ||
      match.slot2GameTeamId === viewerTeam.id,
  ).length;
  return count > 0 ? count : null;
}
