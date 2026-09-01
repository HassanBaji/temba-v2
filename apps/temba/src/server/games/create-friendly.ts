import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  games,
  matches,
  matchSets,
} from "@repo/db";

import { type db } from "~/server/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  FRIENDLY_TEAMS_ALLOWED,
} from "~/server/games/access";
import { assertGameCreateVenueAndCourt } from "~/server/games/venue";
import type {
  CreateFriendlyDb,
  CreateFriendlyGameInput,
  CreateFriendlyGameResult,
} from "~/server/games/utils";

export type {
  CreateFriendlyDb,
  CreateFriendlyGameInput,
  CreateFriendlyGameResult,
} from "~/server/games/utils";

export const FRIENDLY_SET_SHELL_COUNT = 3;

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
      await writeDb(database)
        .insert(matchSets)
        .values(Array.from({ length: missing }, () => ({ matchId: match.id })));
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
        groupId: input.groupId ?? null,
        venueId: input.venueId,
        isPublic: false,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        playersAllowed: FRIENDLY_PLAYERS_ALLOWED,
        teamsAllowed: FRIENDLY_TEAMS_ALLOWED,
        pricePerPlayerCents: input.pricePerPlayerCents ?? null,
        sport: GameSportEnum.PADEL,
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
        Array.from({ length: FRIENDLY_SET_SHELL_COUNT }, () => ({
          matchId: match.id,
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
