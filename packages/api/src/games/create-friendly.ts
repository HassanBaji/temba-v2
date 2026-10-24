import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gameCourts,
  games,
  matches,
  matchSets,
} from "@repo/db";

import {
  footballPlayersAllowedBounds,
  isFootballSideSize,
} from "@repo/domain/game-shape";

import { type db } from "#src/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
} from "#src/games/access";
import { assertGameCreateVenueAndCourt } from "#src/games/assert-game-create-venue-and-court";
import { nextMatchSetNumber } from "#src/games/next-match-set-number";
import type {
  CreateFootballGameInput,
  CreateFriendlyDb,
  CreateFriendlyGameInput,
  CreateFriendlyGameResult,
} from "#src/games/utils";

export type {
  CreateFriendlyDb,
  CreateFriendlyGameInput,
  CreateFriendlyGameResult,
} from "#src/games/utils";

export const FRIENDLY_SET_SHELL_COUNT = 3;

export async function createFootballGame(
  database: CreateFriendlyDb,
  input: CreateFootballGameInput,
) {
  if (!isFootballSideSize(input.sideSize)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Side size must be 5, 6, 7, 8, 9 or 11",
    });
  }
  const bounds = footballPlayersAllowedBounds(input.sideSize);
  if (
    !Number.isInteger(input.playersAllowed) ||
    input.playersAllowed < bounds.min ||
    input.playersAllowed > bounds.max
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Players allowed must be between ${bounds.min} and ${bounds.max}`,
    });
  }
  await assertGameCreateVenueAndCourt(writeDb(database), {
    groupId: input.groupId ?? undefined,
    venueId: input.venueId,
    courtId: input.courtId,
    sport: "football",
  });

  return writeDb(database).transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({
        name: input.name && input.name.length > 0 ? input.name : null,
        format: GameFormatEnum.FRIENDLY_GAME,
        registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
        groupId: input.groupId,
        venueId: input.venueId,
        isPublic: false,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        playersAllowed: input.playersAllowed,
        teamsAllowed: null,
        pricePerPlayerFils: input.pricePerPlayerFils ?? null,
        sport: GameSportEnum.Football,
        sideSize: input.sideSize,
        rated: false,
        createdBy: input.createdBy,
      })
      .returning();

    if (!game) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Game",
      });
    }

    if (input.courtId) {
      await tx
        .insert(gameCourts)
        .values({ gameId: game.id, courtId: input.courtId });
    }

    return { game };
  });
}

function writeDb(database: CreateFriendlyDb): typeof db {
  return database as typeof db;
}

export async function backfillFriendlySetShells(database: CreateFriendlyDb) {
  const friendly = await database.query.games.findMany({
    where: eq(games.format, GameFormatEnum.FRIENDLY_GAME),
    columns: { id: true },
    with: {
      matches: {
        columns: { id: true },
        with: {
          sets: { columns: { id: true } },
        },
      },
    },
  });

  for (const game of friendly) {
    for (const match of game.matches) {
      const missing = FRIENDLY_SET_SHELL_COUNT - match.sets.length;
      if (missing <= 0) {
        continue;
      }
      const start = await nextMatchSetNumber(database, match.id);
      await writeDb(database)
        .insert(matchSets)
        .values(
          Array.from({ length: missing }, (_, index) => ({
            matchId: match.id,
            setNumber: start + index,
          })),
        );
    }
  }
}

export async function createFriendlyGame(
  database: CreateFriendlyDb,
  input: CreateFriendlyGameInput,
): Promise<CreateFriendlyGameResult> {
  await backfillFriendlySetShells(database);
  await assertGameCreateVenueAndCourt(writeDb(database), {
    groupId: input.groupId ?? undefined,
    venueId: input.venueId,
    courtId: input.courtId,
  });

  const durationInMinutes = Math.max(
    0,
    Math.round(
      (input.windowEnd.getTime() - input.windowStart.getTime()) / 60000,
    ),
  );

  return writeDb(database).transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({
        name: input.name && input.name.length > 0 ? input.name : null,
        format: GameFormatEnum.FRIENDLY_GAME,
        registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
        groupId: input.groupId,
        venueId: input.venueId,
        isPublic: false,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        playersAllowed: FRIENDLY_PLAYERS_ALLOWED,
        teamsAllowed: FRIENDLY_TEAMS_ALLOWED,
        pricePerPlayerFils: input.pricePerPlayerFils ?? null,
        levelMinTenths: input.levelMinTenths ?? null,
        levelMaxTenths: input.levelMaxTenths ?? null,
        sport: GameSportEnum.PADEL,
        rated: input.rated ?? true,
        createdBy: input.createdBy,
      })
      .returning();

    if (!game) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Game",
      });
    }

    const [match] = await tx
      .insert(matches)
      .values({
        gameId: game.id,
        courtId: input.courtId ?? null,
        startTime: input.windowStart,
        endTime: input.windowEnd,
        durationInMinutes,
      })
      .returning();

    if (!match) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Match",
      });
    }

    const shells = await tx
      .insert(matchSets)
      .values(
        Array.from({ length: FRIENDLY_SET_SHELL_COUNT }, (_, index) => ({
          matchId: match.id,
          setNumber: index + 1,
        })),
      )
      .returning({ id: matchSets.id });

    if (shells.length !== FRIENDLY_SET_SHELL_COUNT) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Set shells",
      });
    }

    return { game, matchId: match.id };
  });
}
