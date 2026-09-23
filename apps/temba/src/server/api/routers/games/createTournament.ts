import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gameCourts,
  games,
} from "@repo/db";

import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "~/lib/level-range";
import { PRICE_PER_PLAYER_MAX_CENTS } from "~/lib/price-per-player";
import { sizeFriendlyTournament } from "~/lib/tournament-sizing";
import { protectedProcedure } from "~/server/api/trpc";
import { resolveAppUser } from "~/server/auth/resolve-app-user";
import { type db } from "~/server/db";
import { assertMayCreateGameOnGroup } from "~/server/games/access";
import { assertGameCreateVenueAndCourt } from "~/server/games/assert-game-create-venue-and-court";
import { requireGroup } from "~/server/games/helpers/require-group";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ONE_DAY_WINDOW_MESSAGE =
  "Finish time must be within 24 hours of the start";

function windowWithinOneDay(windowStart: Date, windowEnd: Date) {
  return windowEnd.getTime() - windowStart.getTime() <= ONE_DAY_MS;
}

function assertMatchMinutes(matchMinutes: number) {
  if (
    !Number.isInteger(matchMinutes) ||
    matchMinutes < 10 ||
    matchMinutes > 120 ||
    matchMinutes % 5 !== 0
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Match length must be from 10 to 120 minutes, in steps of 5",
    });
  }
}

export const createTournamentInputSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    groupId: z.string().uuid({ message: "Pick a Group" }),
    isPublic: z.boolean(),
    registrationMode: z.literal("individual").optional(),
    allowSoloRegister: z.boolean().optional().default(true),
    teamCount: z.number().int(),
    poolCount: z.number().int(),
    matchMinutes: z.number().int().min(10).max(120).multipleOf(5),
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    venueId: z.string().uuid({ message: "Pick a Venue" }),
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
  .refine((value) => value.windowEnd.getTime() >= value.windowStart.getTime(), {
    message: "Finish time must be at or after start time",
    path: ["windowEnd"],
  })
  .refine((value) => windowWithinOneDay(value.windowStart, value.windowEnd), {
    message: ONE_DAY_WINDOW_MESSAGE,
    path: ["windowEnd"],
  })
  .superRefine((value, ctx) => {
    const sized = sizeFriendlyTournament(value.teamCount, value.poolCount);
    if (!sized.ok) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: sized.issue.message,
        path: [sized.issue.path],
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
  });

export type CreateTournamentInput = z.input<
  typeof createTournamentInputSchema
> & {
  createdBy: string;
};

export async function createTournament(
  database: DbClient,
  input: CreateTournamentInput,
) {
  assertMatchMinutes(input.matchMinutes);
  if (!windowWithinOneDay(input.windowStart, input.windowEnd)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: ONE_DAY_WINDOW_MESSAGE,
    });
  }

  const sized = sizeFriendlyTournament(input.teamCount, input.poolCount);
  if (!sized.ok) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: sized.issue.message,
    });
  }

  const group = await requireGroup(database, input.groupId);
  await assertMayCreateGameOnGroup(database, group, input.createdBy);
  await assertGameCreateVenueAndCourt(database, {
    groupId: input.groupId,
    venueId: input.venueId,
    courtId: undefined,
    courtIds: input.courtIds,
  });

  const created = await database.transaction(async (tx) => {
    const [game] = await tx
      .insert(games)
      .values({
        name: input.name,
        format: GameFormatEnum.FRIENDLY_TOURNAMENT,
        registrationMode: GameRegistrationModeEnum.INDIVIDUAL,
        allowSoloRegister: input.allowSoloRegister ?? true,
        groupId: input.groupId,
        venueId: input.venueId,
        isPublic: input.isPublic,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        playersAllowed: sized.sizing.playerCount,
        teamsAllowed: sized.sizing.teamCount,
        poolCount: sized.sizing.poolCount,
        matchMinutes: input.matchMinutes,
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

    return game;
  });

  return { id: created.id };
}

export const createTournamentProcedure = protectedProcedure
  .input(createTournamentInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createTournament(ctx.db, {
      ...input,
      createdBy: appUser.id,
    });
  });
