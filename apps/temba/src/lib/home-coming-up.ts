import {
  isTournamentMatchRow,
  isDrawnTournamentSummaryRow,
  tournamentCardAction,
  tournamentCardActionLabel,
  tournamentMatchRoundLabel,
  tournamentMatchup,
  tournamentMatchupName,
  tournamentTeamsLine,
  type TournamentCardInput,
  type TournamentKnockoutMatch,
} from "~/lib/tournament-card";

type Occupant = { name: string; isViewer: boolean } | null;

export type HomeComingUpSource = TournamentCardInput & {
  id: string;
  matchId: string | null;
  format: string;
  poolCount: number | null;
  name: string | null;
  venue: { name: string } | null;
  startTime: Date | string;
  registeredUserCount: number;
  playersAllowed: number | null;
  sides: readonly { left: Occupant; right: Occupant }[];
  roundNumber: number | null;
  roundCount: number | null;
  knockoutMatch?: TournamentKnockoutMatch | null;
};

export type HomeComingUpGameRow = {
  kind: "game";
  id: string;
  rowKey: string;
  venueName: string;
  startsAt: Date;
  seatsTaken: number;
  seatsTotal: number;
};

export type HomeComingUpTournamentMatchRow = {
  kind: "tournament_match";
  id: string;
  rowKey: string;
  title: string;
  startsAt: Date;
  roundTag: string | null;
  opponentLine: string | null;
};

export type HomeComingUpTournamentRow = {
  kind: "tournament";
  id: string;
  rowKey: string;
  title: string;
  startsAt: Date;
  teamsLine: string;
  /** Null once the viewer is in: the row itself opens the Game. */
  actionLabel: string | null;
};

export type HomeComingUpRow =
  | HomeComingUpGameRow
  | HomeComingUpTournamentMatchRow
  | HomeComingUpTournamentRow;

function tournamentTitle(game: HomeComingUpSource) {
  return game.name ?? game.venue?.name ?? "Tournament";
}

function toRow(game: HomeComingUpSource): HomeComingUpRow {
  const startsAt = new Date(game.startTime);
  if (game.matchId != null && isTournamentMatchRow(game)) {
    const opponent = tournamentMatchupName(
      tournamentMatchup(game.sides).opponent,
    );
    return {
      kind: "tournament_match",
      id: game.id,
      rowKey: game.matchId,
      title: tournamentTitle(game),
      startsAt,
      roundTag: tournamentMatchRoundLabel(game),
      opponentLine: opponent ? `vs ${opponent}` : null,
    };
  }
  if (isDrawnTournamentSummaryRow(game)) {
    const action = tournamentCardAction(game);
    return {
      kind: "tournament",
      id: game.id,
      rowKey: game.id,
      title: tournamentTitle(game),
      startsAt,
      teamsLine: tournamentTeamsLine(game),
      actionLabel: action === "view" ? null : tournamentCardActionLabel(action),
    };
  }
  return {
    kind: "game",
    id: game.id,
    rowKey: game.matchId ?? game.id,
    venueName: game.venue?.name ?? "Game",
    startsAt,
    seatsTaken: game.registeredUserCount,
    seatsTotal: game.playersAllowed ?? game.sides.length * 2,
  };
}

/** Drawn tournaments behind the hero keep their tournament identity in Coming up. */
export function homeComingUpRows(games: readonly HomeComingUpSource[]) {
  return games.map(toRow);
}
