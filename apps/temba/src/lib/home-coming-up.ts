import {
  isPoolMatchRow,
  tournamentMatchup,
  tournamentMatchupName,
} from "~/lib/tournament-card";
import { poolRoundLabel } from "~/lib/tournament-rounds";

type Occupant = { name: string; isViewer: boolean } | null;

export type HomeComingUpSource = {
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

export type HomeComingUpTournamentRow = {
  kind: "tournament_match";
  id: string;
  rowKey: string;
  title: string;
  startsAt: Date;
  roundTag: string | null;
  opponentLine: string | null;
};

export type HomeComingUpRow = HomeComingUpGameRow | HomeComingUpTournamentRow;

function toRow(game: HomeComingUpSource): HomeComingUpRow {
  const startsAt = new Date(game.startTime);
  if (game.matchId != null && isPoolMatchRow(game)) {
    const opponent = tournamentMatchupName(
      tournamentMatchup(game.sides).opponent,
    );
    return {
      kind: "tournament_match",
      id: game.id,
      rowKey: game.matchId,
      title: game.name ?? game.venue?.name ?? "Tournament",
      startsAt,
      roundTag: poolRoundLabel(game.roundNumber, game.roundCount),
      opponentLine: opponent ? `vs ${opponent}` : null,
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

/** Pool Matches behind the hero keep their tournament identity in Coming up. */
export function homeComingUpRows(games: readonly HomeComingUpSource[]) {
  return games.map(toRow);
}
