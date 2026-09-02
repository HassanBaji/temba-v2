import { TRPCError } from "@trpc/server";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gameCourts,
  games,
} from "@repo/db";

import { type db } from "~/server/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  assertMayCreateGameOnGroup,
} from "~/server/games/access";
import { assertGameCreateVenueAndCourt } from "~/server/games/assert-game-create-venue-and-court";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { requireGroup } from "~/server/games/helpers/require-group";
import type { CreateGameInput } from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function createGame(database: DbClient, input: CreateGameInput) {
  if (input.groupId) {
    const group = await requireGroup(database, input.groupId);
    await assertMayCreateGameOnGroup(database, group, input.createdBy);
  }

  const isAmericano = input.format === "americano";
  const isTournament = input.format === "friendly_tournament";

  if (!isAmericano && !isTournament) {
    const created = await createFriendlyGame(database, {
      createdBy: input.createdBy,
      name: input.name,
      groupId: input.groupId,
      venueId: input.venueId,
      courtId: input.courtId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      pricePerPlayerCents: input.pricePerPlayerCents ?? null,
      levelMinTenths: input.levelMinTenths ?? null,
      levelMaxTenths: input.levelMaxTenths ?? null,
    });
    return {
      id: created.game.id,
      matchId: created.matchId,
    };
  }

  await assertGameCreateVenueAndCourt(database, {
    groupId: input.groupId,
    venueId: input.venueId,
    courtId: input.courtId,
    courtIds: input.courtIds,
  });

  const windowStart = input.windowStart;
  const windowEnd = input.windowEnd;
  const formatEnum = isAmericano
    ? GameFormatEnum.AMERICANO
    : GameFormatEnum.FRIENDLY_TOURNAMENT;
  const registrationMode = GameRegistrationModeEnum.INDIVIDUAL;
  const playersAllowed = input.playersAllowed ?? FRIENDLY_PLAYERS_ALLOWED;

  const created = await database.transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({
        name: input.name && input.name.length > 0 ? input.name : null,
        format: formatEnum,
        registrationMode,
        groupId: input.groupId ?? null,
        venueId: input.venueId,
        isPublic: false,
        windowStart,
        windowEnd,
        playersAllowed,
        teamsAllowed: null,
        pricePerPlayerCents: input.pricePerPlayerCents ?? null,
        levelMinTenths: input.levelMinTenths ?? null,
        levelMaxTenths: input.levelMaxTenths ?? null,
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

    if (input.courtIds && input.courtIds.length > 0) {
      await tx.insert(gameCourts).values(
        input.courtIds.map((courtId) => ({
          gameId: game.id,
          courtId,
        })),
      );
    }
    return { game, matchId: null as string | null };
  });

  return {
    id: created.game.id,
    matchId: created.matchId,
  };
}
