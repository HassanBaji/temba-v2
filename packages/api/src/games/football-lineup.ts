import { TRPCError } from "@trpc/server";
import { and, asc, eq, ne } from "drizzle-orm";

import {
  MatchStatusEnum,
  gamePlayers,
  gameTeams,
  matchSets,
  matches,
} from "@repo/db";

import {
  KEEPER_SEATS_TAKEN_MESSAGE,
  KEEPERS_PER_GAME,
} from "@repo/domain/football-lineup";
import { isFootballGame } from "@repo/domain/game-shape";
import { type GameRow } from "#src/games/access";
import { type db } from "#src/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const FOOTBALL_SCORE_SET_NUMBER = 1;

export function assertFootballGame(game: GameRow) {
  if (!isFootballGame(game) || game.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only a football Game has teams and a Score",
    });
  }
}

export function assertGameNotCancelled(game: GameRow) {
  if (game.cancelledAt) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This Game is cancelled",
    });
  }
}

export async function assertKeeperSeatOpen(
  database: DbClient,
  gameId: string,
  exceptUserId?: string,
) {
  const keepers = await database.query.gamePlayers.findMany({
    where: and(
      eq(gamePlayers.gameId, gameId),
      eq(gamePlayers.footballRole, "keeper"),
    ),
    columns: { userId: true },
  });
  const others = keepers.filter((row) => row.userId !== exceptUserId);
  if (others.length >= KEEPERS_PER_GAME) {
    throw new TRPCError({
      code: "CONFLICT",
      message: KEEPER_SEATS_TAKEN_MESSAGE,
    });
  }
}

/** The two sides a published football Game carries, by side index. */
export async function footballSides(database: DbClient, gameId: string) {
  const rows = await database.query.gameTeams.findMany({
    where: eq(gameTeams.gameId, gameId),
    columns: { id: true, sideIndex: true, bib: true },
  });
  return {
    slot1: rows.find((row) => row.sideIndex === 1) ?? null,
    slot2: rows.find((row) => row.sideIndex === 2) ?? null,
  };
}

/** A football Game's one Match: it exists once teams are published. */
export async function footballMatch(database: DbClient, gameId: string) {
  return (
    (await database.query.matches.findFirst({
      where: and(
        eq(matches.gameId, gameId),
        ne(matches.status, MatchStatusEnum.CANCELLED),
      ),
      orderBy: asc(matches.createdAt),
    })) ?? null
  );
}

export async function footballScoreSet(database: DbClient, matchId: string) {
  return (
    (await database.query.matchSets.findFirst({
      where: and(
        eq(matchSets.matchId, matchId),
        eq(matchSets.setNumber, FOOTBALL_SCORE_SET_NUMBER),
      ),
    })) ?? null
  );
}

export function footballScoreOf(
  set: { slot1GamesWon: number | null; slot2GamesWon: number | null } | null,
) {
  if (set?.slot1GamesWon == null || set.slot2GamesWon == null) {
    return null;
  }
  return { slot1: set.slot1GamesWon, slot2: set.slot2GamesWon };
}

/** The score opens at kick-off; a Game with no time opens it at once. */
export function footballScoreOpen(game: GameRow, now: Date) {
  return (
    game.windowStart == null || game.windowStart.getTime() <= now.getTime()
  );
}
