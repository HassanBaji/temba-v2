import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  TournamentShapeEnum,
  gameCourts,
  games,
} from "@repo/db";

import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "@repo/domain/level-range";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import {
  sizeFriendlyTournament,
  tournamentTeamCountIssue,
  validateQualifiersPerPool,
  validateRoundCount,
  type TournamentSizingIssue,
} from "@repo/domain/tournament-sizing";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { assertMayCreateGameOnGroup } from "#src/games/access";
import { assertGameCreateVenueAndCourt } from "#src/games/assert-game-create-venue-and-court";
import { requireGroup } from "#src/games/helpers/require-group";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ONE_DAY_WINDOW_MESSAGE =
  "Finish time must be within 24 hours of the start";

function windowWithinOneDay(windowStart: Date, windowEnd: Date) {
  return windowEnd.getTime() - windowStart.getTime() <= ONE_DAY_MS;
}

type RoundCountIssue = { path: "roundCount"; message: string };
type QualifiersIssue = { path: "qualifiersPerPool"; message: string };

const QUALIFIERS_SHAPE_MESSAGE =
  "Through from each group applies to Groups, then knockout only";

type ShapeSizing =
  | {
      ok: true;
      tournamentShape: TournamentShapeEnum;
      playerCount: number;
      teamCount: number;
      poolCount: number | null;
      roundCount: number | null;
      qualifiersPerPool: number | null;
    }
  | {
      ok: false;
      issue: TournamentSizingIssue | RoundCountIssue | QualifiersIssue;
    };

function sizeTournamentShape(value: {
  tournamentShape?: "groups_only" | "groups_then_knockout" | "knockout_only";
  teamCount: number;
  poolCount?: number;
  roundCount?: number | null;
  qualifiersPerPool?: number | null;
}): ShapeSizing {
  const groupsThenKnockout = value.tournamentShape === "groups_then_knockout";
  if (!groupsThenKnockout && value.qualifiersPerPool != null) {
    return {
      ok: false,
      issue: { path: "qualifiersPerPool", message: QUALIFIERS_SHAPE_MESSAGE },
    };
  }
  if (value.tournamentShape === "knockout_only") {
    const issue = tournamentTeamCountIssue(value.teamCount);
    if (issue) {
      return { ok: false, issue };
    }
    return {
      ok: true,
      tournamentShape: TournamentShapeEnum.KNOCKOUT_ONLY,
      playerCount: value.teamCount * 2,
      teamCount: value.teamCount,
      poolCount: null,
      roundCount: null,
      qualifiersPerPool: null,
    };
  }
  const sized = sizeFriendlyTournament(value.teamCount, value.poolCount ?? NaN);
  if (!sized.ok) {
    return sized;
  }
  const rounds = validateRoundCount(sized.sizing.poolSizes, value.roundCount);
  if (!rounds.ok) {
    return rounds;
  }
  const qualifiers = groupsThenKnockout
    ? validateQualifiersPerPool(sized.sizing.poolSizes, value.qualifiersPerPool)
    : null;
  if (qualifiers && !qualifiers.ok) {
    return qualifiers;
  }
  return {
    ok: true,
    tournamentShape: groupsThenKnockout
      ? TournamentShapeEnum.GROUPS_THEN_KNOCKOUT
      : TournamentShapeEnum.GROUPS_ONLY,
    playerCount: sized.sizing.playerCount,
    teamCount: sized.sizing.teamCount,
    poolCount: sized.sizing.poolCount,
    roundCount: rounds.roundCount,
    qualifiersPerPool: qualifiers?.qualifiersPerPool ?? null,
  };
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
    tournamentShape: z
      .enum(["groups_only", "groups_then_knockout", "knockout_only"])
      .optional(),
    teamCount: z.number().int(),
    poolCount: z.number().int().optional(),
    roundCount: z.number().int().nullable().optional(),
    qualifiersPerPool: z.number().int().nullable().optional(),
    matchMinutes: z.number().int().min(10).max(120).multipleOf(5),
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    venueId: z.string().uuid({ message: "Pick a Venue" }),
    courtIds: z.array(z.string().uuid()).optional(),
    pricePerPlayerFils: z
      .number()
      .int()
      .min(0)
      .max(PRICE_PER_PLAYER_MAX_FILS)
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
    const sized = sizeTournamentShape(value);
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

  const sized = sizeTournamentShape(input);
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
        playersAllowed: sized.playerCount,
        teamsAllowed: sized.teamCount,
        tournamentShape: sized.tournamentShape,
        poolCount: sized.poolCount,
        roundCount: sized.roundCount,
        qualifiersPerPool: sized.qualifiersPerPool,
        matchMinutes: input.matchMinutes,
        pricePerPlayerFils: input.pricePerPlayerFils ?? null,
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
