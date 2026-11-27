import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";

import {
  americanoFixedPairs,
  gamePlayers,
  gameTeams,
  games,
  matchSets,
  matches,
  venues,
  type DbClient as RepoDbClient,
} from "@repo/db";

import { DEFAULT_LOCALE } from "@repo/i18n/locale";

import {
  DEFAULT_FOOTBALL_BIBS,
  type FootballBib,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import { MATCH_STATUS } from "@repo/domain/match-status";
import { computePoolTables } from "@repo/domain/pool-table";
import { seriesWinRule } from "@repo/domain/series";
import {
  seriesEditionResult,
  type SeriesEditionResult,
  type SeriesResultAmericano,
  type SeriesResultGame,
} from "@repo/domain/series-result";
import {
  americanoTable,
  americanoWinners,
  isAmericano,
} from "@repo/domain/tournament-americano";

import { type db } from "#src/db";
import {
  americanoDayFinished,
  americanoMatchesOf,
  americanoPlayersOf,
  americanoResults,
} from "#src/games/americano-matches";
import { isEdition, loadEditionNumbers } from "#src/series/edition-order";

type DbClient =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0]
  | RepoDbClient;

export type SeriesEditionsScope =
  | { seriesIds: readonly string[] }
  | { gameIds: readonly string[] };

export type SeriesEditionWinner = {
  userId: string;
  name: string;
  image: string | null;
  isGuest: boolean;
  /** The winning Game team they sit on; null on an Americano, which has none. */
  gameTeamId: string | null;
};

type GameRow = typeof games.$inferSelect;

export type SeriesEdition = {
  game: {
    id: string;
    seriesId: string;
    format: GameRow["format"];
    sport: GameRow["sport"];
    tournamentShape: string | null;
    poolCount: number | null;
    name: string | null;
    windowStart: Date | null;
    windowEnd: Date | null;
    venueName: string | null;
    playersAllowed: number | null;
    teamsAllowed: number | null;
  };
  edition: number;
  result: SeriesEditionResult;
  winners: SeriesEditionWinner[];
  /** The winning side's Bib on a football Game. */
  winnerBib: FootballBib | null;
  /** The single Match's Sets on a decided Friendly game. */
  score: {
    slot1GameTeamId: string | null;
    slot2GameTeamId: string | null;
    sets: { slot1GamesWon: number | null; slot2GamesWon: number | null }[];
  } | null;
  /** When the result was read as decided: the latest completed Match, or the posted Final order. */
  decidedAt: Date | null;
  seatedUserIds: string[];
  /** Who played it: on a Game team (a Football side included), or in an Americano seat. */
  playedUserIds: string[];
  teamCount: number;
  playerCount: number;
  /** The winners' points on a won Rounds table, or their games won on a won Americano. */
  winnerPoints: number | null;
};

function groupBy<Row, Key>(rows: readonly Row[], keyOf: (row: Row) => Key) {
  const grouped = new Map<Key, Row[]>();
  for (const row of rows) {
    const key = keyOf(row);
    const list = grouped.get(key) ?? [];
    list.push(row);
    grouped.set(key, list);
  }
  return grouped;
}

async function loadGames(database: DbClient, scope: SeriesEditionsScope) {
  const inScope =
    "seriesIds" in scope
      ? inArray(games.seriesId, [...scope.seriesIds])
      : inArray(games.id, [...scope.gameIds]);
  return database
    .select({
      id: games.id,
      seriesId: games.seriesId,
      groupId: games.groupId,
      challengeId: games.challengeId,
      format: games.format,
      sport: games.sport,
      tournamentShape: games.tournamentShape,
      poolCount: games.poolCount,
      roundCount: games.roundCount,
      name: games.name,
      windowStart: games.windowStart,
      windowEnd: games.windowEnd,
      venueName: venues.name,
      playersAllowed: games.playersAllowed,
      teamsAllowed: games.teamsAllowed,
      cancelledAt: games.cancelledAt,
      drawPostedAt: games.drawPostedAt,
      finalOrderPostedAt: games.finalOrderPostedAt,
    })
    .from(games)
    .leftJoin(venues, eq(venues.id, games.venueId))
    .where(and(inScope, isNotNull(games.seriesId), isEdition));
}

function winnerPoints(
  game: SeriesResultGame,
  result: SeriesEditionResult,
): number | null {
  if (result.state !== "won") {
    return null;
  }
  const rule = seriesWinRule(game);
  if (rule === "americano" && game.americano) {
    const [winner] = americanoWinners(
      americanoTable(
        game.americano.playerIds,
        game.americano.results,
        game.americano.fixedPairs,
      ),
    );
    return winner?.gamesWon ?? null;
  }
  if (rule !== "table") {
    return null;
  }
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
  const winner = tables?.pools[0]?.rows.find((row) => row.isWinner);
  return winner?.points ?? null;
}

function latest(dates: readonly (Date | null)[]) {
  let found: Date | null = null;
  for (const date of dates) {
    if (date && (!found || date.getTime() > found.getTime())) {
      found = date;
    }
  }
  return found;
}

/**
 * Every Edition of the given Series, or of the given Games, that is not
 * cancelled, with its number, its result (`seriesEditionResult`) and what the
 * Series reads need around it. Six queries however many Games: the Games
 * with their Venue,
 * their Series' numbering, Game teams, Game players with Users, Matches with
 * Sets and Americano seats, and Americano fixed pairs.
 */
export async function loadSeriesEditions(
  database: DbClient,
  scope: SeriesEditionsScope,
): Promise<SeriesEdition[]> {
  const ids = "seriesIds" in scope ? scope.seriesIds : scope.gameIds;
  if (ids.length === 0) {
    return [];
  }
  const gameRows = await loadGames(database, scope);
  if (gameRows.length === 0) {
    return [];
  }
  const gameIds = gameRows.map((game) => game.id);
  const seriesIds = [
    ...new Set(
      gameRows.flatMap((game) => (game.seriesId ? [game.seriesId] : [])),
    ),
  ];

  const [fixedPairRows, editions, teamRows, playerRows, matchRows] =
    await Promise.all([
      database.query.americanoFixedPairs.findMany({
        where: inArray(americanoFixedPairs.gameId, gameIds),
        orderBy: [asc(americanoFixedPairs.position)],
        columns: {
          gameId: true,
          firstGamePlayerId: true,
          secondGamePlayerId: true,
        },
      }),
      loadEditionNumbers(database, seriesIds),
      database.query.gameTeams.findMany({
        where: inArray(gameTeams.gameId, gameIds),
        columns: {
          id: true,
          gameId: true,
          poolIndex: true,
          sideIndex: true,
          finalPlace: true,
          bib: true,
        },
        with: { players: { columns: { gamePlayerId: true } } },
      }),
      database.query.gamePlayers.findMany({
        where: inArray(gamePlayers.gameId, gameIds),
        orderBy: [asc(gamePlayers.createdAt), asc(gamePlayers.id)],
        columns: { id: true, gameId: true, userId: true },
        with: {
          user: {
            columns: { id: true, name: true, image: true, guestAt: true },
          },
        },
      }),
      database.query.matches.findMany({
        where: inArray(matches.gameId, gameIds),
        with: {
          sets: {
            columns: { slot1GamesWon: true, slot2GamesWon: true },
            orderBy: asc(matchSets.setNumber),
          },
          americanoSeats: {
            columns: { id: true, gamePlayerId: true, slot: true },
          },
          court: { columns: { id: true, name: true } },
        },
      }),
    ]);

  const userIdByGamePlayer = new Map(
    playerRows.map((row) => [row.id, row.userId]),
  );
  const userById = new Map(
    playerRows.flatMap((row) => (row.user ? [[row.user.id, row.user]] : [])),
  );
  const teamsByGame = groupBy(teamRows, (row) => row.gameId);
  const playersByGame = groupBy(playerRows, (row) => row.gameId);
  const matchesByGame = groupBy(matchRows, (row) => row.gameId);
  const fixedPairsByGame = groupBy(fixedPairRows, (row) => row.gameId);

  const entries = gameRows.flatMap((game): SeriesEdition[] => {
    const edition = editions.get(game.id);
    if (!game.seriesId || edition === undefined) {
      return [];
    }
    const teams = (teamsByGame.get(game.id) ?? []).map((team) => ({
      ...team,
      userIds: team.players.flatMap((link) => {
        const userId = userIdByGamePlayer.get(link.gamePlayerId);
        return userId ? [userId] : [];
      }),
    }));
    const players = playersByGame.get(game.id) ?? [];
    const gameMatches = matchesByGame.get(game.id) ?? [];

    let americano: SeriesResultAmericano | null = null;
    if (isAmericano(game.format, game.tournamentShape)) {
      const rows = americanoMatchesOf(gameMatches);
      const seated = americanoPlayersOf(players);
      americano = {
        finished: americanoDayFinished(rows),
        playerIds: seated.map((player) => player.gamePlayerId),
        userIdByPlayerId: Object.fromEntries(
          seated.map((player) => [player.gamePlayerId, player.userId]),
        ),
        results: americanoResults(rows),
        fixedPairs: (fixedPairsByGame.get(game.id) ?? []).map(
          (pair) => [pair.firstGamePlayerId, pair.secondGamePlayerId] as const,
        ),
      };
    }

    const resultGame = {
      ...game,
      gameTeams: teams,
      matches: gameMatches,
      americano,
    };
    const result = seriesEditionResult(resultGame);
    const decided = result.state !== "upcoming";
    const winningTeams =
      result.state === "won"
        ? teams.filter((team) => result.gameTeamIds.includes(team.id))
        : [];
    const winners =
      result.state === "won"
        ? result.userIds.flatMap((userId) => {
            const found = userById.get(userId);
            return found
              ? [
                  {
                    userId,
                    name: found.name,
                    image: found.image,
                    isGuest: found.guestAt !== null,
                    gameTeamId:
                      winningTeams.find((team) => team.userIds.includes(userId))
                        ?.id ?? null,
                  },
                ]
              : [];
          })
        : [];
    const winningTeam = winningTeams.length === 1 ? winningTeams[0] : undefined;
    const winnerBib =
      isFootballGame(game) && winningTeam
        ? (winningTeam.bib ??
          (winningTeam.sideIndex === 2
            ? DEFAULT_FOOTBALL_BIBS.slot2
            : DEFAULT_FOOTBALL_BIBS.slot1))
        : null;
    const seatedUserIds = [
      ...new Set(players.flatMap((row) => (row.userId ? [row.userId] : []))),
    ];
    const single =
      game.format === "friendly_game"
        ? (gameMatches.find(
            (match) => match.status === MATCH_STATUS.COMPLETED,
          ) ?? gameMatches[0])
        : undefined;

    return [
      {
        game: {
          id: game.id,
          seriesId: game.seriesId,
          format: game.format,
          sport: game.sport,
          tournamentShape: game.tournamentShape,
          poolCount: game.poolCount,
          name: game.name,
          windowStart: game.windowStart,
          windowEnd: game.windowEnd,
          venueName: game.venueName,
          playersAllowed: game.playersAllowed,
          teamsAllowed: game.teamsAllowed,
        },
        edition,
        result,
        winners,
        winnerBib,
        score:
          decided && single
            ? {
                slot1GameTeamId: single.slot1GameTeamId,
                slot2GameTeamId: single.slot2GameTeamId,
                sets: single.sets,
              }
            : null,
        decidedAt: decided
          ? (game.finalOrderPostedAt ??
            latest(gameMatches.map((match) => match.completedAt)))
          : null,
        seatedUserIds,
        playedUserIds: americano
          ? seatedUserIds
          : [...new Set(teams.flatMap((team) => team.userIds))],
        teamCount: teams.length,
        playerCount: players.length,
        winnerPoints: winnerPoints(resultGame, result),
      },
    ];
  });

  return entries.sort(
    (left, right) =>
      left.game.seriesId.localeCompare(right.game.seriesId) ||
      left.edition - right.edition,
  );
}

/** The Game's window is over: an Edition still upcoming then is awaiting its result. */
export function seriesEditionWindowEnded(
  game: Pick<SeriesEdition["game"], "windowStart" | "windowEnd">,
  now: Date,
) {
  const end = game.windowEnd ?? game.windowStart;
  return end !== null && end.getTime() <= now.getTime();
}
