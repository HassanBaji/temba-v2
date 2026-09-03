import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gameCourts,
  games,
} from "@repo/db";

import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  assertMayCreateGameOnGroup,
} from "~/server/games/access";
import { assertGameCreateVenueAndCourt } from "~/server/games/assert-game-create-venue-and-court";
import { createFriendlyGame } from "~/server/games/create-friendly";
import { requireGroup } from "~/server/games/helpers/require-group";
import type { CreateGameInput } from "~/server/games/utils";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "~/lib/level-range";
import { PRICE_PER_PLAYER_MAX_CENTS } from "~/lib/price-per-player";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const registrationModeSchema = z.enum(["individual", "team_only"]);
const createFormatSchema = z.enum([
  "friendly_game",
  "americano",
  "friendly_tournament",
]);

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

export const create = protectedProcedure
  .input(
    z
      .object({
        name: z.string().trim().max(255).optional(),
        groupId: z.string().uuid().optional(),
        isPublic: z.boolean(),
        format: createFormatSchema.default("friendly_game"),
        registrationMode: registrationModeSchema,
        playersAllowed: z.number().int().optional(),
        teamsAllowed: z.number().int().optional(),
        windowStart: z.coerce.date(),
        windowEnd: z.coerce.date(),
        venueId: z.string().uuid({ message: "Pick a Venue" }),
        courtId: z.string().uuid().nullable().optional(),
        courtIds: z.array(z.string().uuid()).optional(),
        pricePerPlayerCents: z
          .number()
          .int()
          .min(0)
          .max(PRICE_PER_PLAYER_MAX_CENTS)
          .nullable()
          .optional(),
        levelMinTenths: z
          .number()
          .int()
          .min(LEVEL_TENTHS_MIN)
          .max(LEVEL_TENTHS_MAX)
          .nullable()
          .optional(),
        levelMaxTenths: z
          .number()
          .int()
          .min(LEVEL_TENTHS_MIN)
          .max(LEVEL_TENTHS_MAX)
          .nullable()
          .optional(),
      })
      .refine(
        (value) => value.windowEnd.getTime() >= value.windowStart.getTime(),
        {
          message: "Finish time must be at or after start time",
          path: ["windowEnd"],
        },
      )
      .refine(
        (value) =>
          value.format !== "americano" ||
          value.registrationMode === "individual",
        { message: "Americano is individual-only" },
      )
      .refine(
        (value) => {
          if (value.format !== "americano") {
            return true;
          }
          const cap = value.playersAllowed;
          return cap != null && cap >= 4 && cap % 4 === 0;
        },
        {
          message:
            "Americano players allowed must be a multiple of 4, minimum 4",
        },
      )
      .refine(
        (value) => {
          if (value.format !== "friendly_tournament") {
            return true;
          }
          if (value.registrationMode === "team_only") {
            return (value.teamsAllowed ?? 0) >= 2;
          }
          const cap = value.playersAllowed;
          return cap != null && cap >= 4 && cap % 4 === 0;
        },
        {
          message:
            "Tournament cap must be players allowed ×4 (min 4) or teams allowed ≥ 2",
        },
      )
      .superRefine((value, ctx) => {
        if (value.format === "friendly_game" && value.courtIds !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Friendly game does not accept courtIds",
            path: ["courtIds"],
          });
        }
        if (value.format !== "friendly_game" && value.courtId !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "courtId is only for Friendly game",
            path: ["courtId"],
          });
        }
        if (
          value.courtIds != null &&
          new Set(value.courtIds).size !== value.courtIds.length
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate courtIds",
            path: ["courtIds"],
          });
        }
        if (
          value.levelMinTenths != null &&
          value.levelMaxTenths != null &&
          value.levelMinTenths > value.levelMaxTenths
        ) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: LEVEL_RANGE_INVERTED_MESSAGE,
            path: ["levelMinTenths"],
          });
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: LEVEL_RANGE_INVERTED_MESSAGE,
            path: ["levelMaxTenths"],
          });
        }
      }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createGame(ctx.db, {
      ...input,
      createdBy: appUser.id,
    });
  });
