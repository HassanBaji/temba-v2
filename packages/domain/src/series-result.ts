import { DEFAULT_LOCALE } from "@repo/i18n/locale";

import { matchOutcome } from "./match-outcome";
import { computePoolTables } from "./pool-table";
import { carriesSeries, seriesWinRule } from "./series";
import { americanoTable, type AmericanoResult } from "./tournament-americano";
import {
  knockoutChampion,
  postedKnockoutRounds,
} from "./tournament-knockout-view";

type SeriesResultSet = {
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

export type SeriesResultGameTeam = {
  id: string;
  poolIndex: number | null;
  sideIndex: number | null;
  finalPlace: number | null;
  userIds: readonly string[];
};

export type SeriesResultMatch = {
  id: string;
  status: string | null;
  roundNumber: number | null;
  knockoutRound: number | null;
  knockoutPosition: number | null;
  slot1GameTeamId: string | null;
  slot2GameTeamId: string | null;
  walkoverGameTeamId: string | null;
  startTime: Date | null;
  sets: readonly SeriesResultSet[];
};

export type SeriesResultAmericano = {
  /** `americanoDayFinished` over the Game's Matches. */
  finished: boolean;
  /** Game player ids in the order they took a seat: the table's last tie-break. */
  playerIds: readonly string[];
  userIdByPlayerId: Readonly<Record<string, string | null>>;
  /** `americanoResults` over the Game's Matches. */
  results: readonly AmericanoResult[];
};

export type SeriesResultGame = {
  format: string;
  sport: string;
  groupId: string | null;
  challengeId: string | null;
  tournamentShape: string | null;
  poolCount: number | null;
  roundCount: number | null;
  cancelledAt: Date | null;
  drawPostedAt: Date | null;
  finalOrderPostedAt: Date | null;
  gameTeams: readonly SeriesResultGameTeam[];
  matches: readonly SeriesResultMatch[];
  /** Americano only; null on every other kind. */
  americano: SeriesResultAmericano | null;
};

export type SeriesEditionResult =
  | { state: "upcoming" }
  | { state: "no_winner" }
  | { state: "won"; gameTeamIds: string[]; userIds: string[] };

const UPCOMING: SeriesEditionResult = { state: "upcoming" };
const NO_WINNER: SeriesEditionResult = { state: "no_winner" };

function wonByTeams(
  game: SeriesResultGame,
  gameTeamIds: readonly string[],
): SeriesEditionResult {
  if (gameTeamIds.length === 0) {
    return NO_WINNER;
  }
  const userIds = new Set<string>();
  for (const gameTeamId of gameTeamIds) {
    const team = game.gameTeams.find((entry) => entry.id === gameTeamId);
    for (const userId of team?.userIds ?? []) {
      userIds.add(userId);
    }
  }
  return {
    state: "won",
    gameTeamIds: [...gameTeamIds],
    userIds: [...userIds],
  };
}

function friendlyGameResult(game: SeriesResultGame): SeriesEditionResult {
  const match = game.matches.find((entry) => entry.status === "completed");
  if (!match) {
    return UPCOMING;
  }
  const { result } = matchOutcome(match.sets);
  if (result === "none") {
    return UPCOMING;
  }
  if (result === "draw") {
    return NO_WINNER;
  }
  const winner =
    result === "slot1" ? match.slot1GameTeamId : match.slot2GameTeamId;
  return wonByTeams(game, winner ? [winner] : []);
}

function knockoutResult(game: SeriesResultGame): SeriesEditionResult {
  const champion = knockoutChampion(
    postedKnockoutRounds({
      matches: game.matches.map((match) => ({
        ...match,
        courtName: null,
        result: matchOutcome(match.sets).result,
      })),
      gameTeams: game.gameTeams.map((team) => ({
        id: team.id,
        name: null,
        members: [],
      })),
      viewerUserId: "",
      locale: DEFAULT_LOCALE,
    }),
  );
  return champion ? wonByTeams(game, [champion.gameTeamId]) : UPCOMING;
}

function poolResult(game: SeriesResultGame): SeriesEditionResult {
  const tables = computePoolTables({
    format: game.format,
    poolCount: game.poolCount,
    gameTeams: game.gameTeams.map((team) => ({
      id: team.id,
      name: null,
      sideIndex: team.sideIndex,
      poolIndex: team.poolIndex,
      members: [],
    })),
    matches: game.matches,
    viewerUserId: "",
    locale: DEFAULT_LOCALE,
    storedRoundCount: game.roundCount,
  });
  if (!tables?.finished) {
    return UPCOMING;
  }
  return wonByTeams(
    game,
    tables.pools.flatMap((pool) =>
      pool.winnerGameTeamId ? [pool.winnerGameTeamId] : [],
    ),
  );
}

function kingResult(game: SeriesResultGame): SeriesEditionResult {
  if (game.finalOrderPostedAt == null) {
    return UPCOMING;
  }
  const king = game.gameTeams.find((team) => team.finalPlace === 1);
  return wonByTeams(game, king ? [king.id] : []);
}

function americanoResult(game: SeriesResultGame): SeriesEditionResult {
  const americano = game.americano;
  if (!americano?.finished) {
    return UPCOMING;
  }
  const first = americanoTable(americano.playerIds, americano.results).find(
    (row) => row.place === 1,
  );
  const userId = first ? americano.userIdByPlayerId[first.playerId] : null;
  if (!userId) {
    return NO_WINNER;
  }
  return { state: "won", gameTeamIds: [], userIds: [userId] };
}

/**
 * Whether a Game's Edition is still to be decided, was decided with no winner,
 * or was won and by whom (ADR-0105). Each kind names the winner its finished
 * screen already names, through the same pure functions.
 */
export function seriesEditionResult(
  game: SeriesResultGame,
): SeriesEditionResult {
  if (game.cancelledAt != null || !carriesSeries(game)) {
    return UPCOMING;
  }
  const rule = seriesWinRule(game);
  if (rule === "side") {
    return friendlyGameResult(game);
  }
  if (rule === "king") {
    return kingResult(game);
  }
  if (rule === "americano") {
    return americanoResult(game);
  }
  if (game.drawPostedAt == null) {
    return UPCOMING;
  }
  return rule === "champion" ? knockoutResult(game) : poolResult(game);
}
