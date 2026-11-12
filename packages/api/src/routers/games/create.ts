import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  GameFormatEnum,
  GameRegistrationModeEnum,
  GameSportEnum,
  gameCourts,
  games,
} from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import {
  FRIENDLY_PLAYERS_ALLOWED,
  assertMayCreateGameOnGroup,
} from "#src/games/access";
import { assertGameCreateVenueAndCourt } from "#src/games/assert-game-create-venue-and-court";
import {
  createFootballGame,
  createFriendlyGame,
} from "#src/games/create-friendly";
import { linkNewGameToSeason } from "#src/games/season-link";
import { requireGroup } from "#src/games/helpers/require-group";
import { groupIsVerified } from "#src/groups/group-is-verified";
import type { CreateGameInput } from "#src/games/utils";
import {
  levelRangeInvertedMessage,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "@repo/domain/level-range";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_FOOTBALL_SIDE_SIZE } from "@repo/domain/game-shape";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import { sportOrDefault } from "@repo/domain/sport";
import { ratingFlagsAtCreate } from "@repo/domain/game-rating-scope";
import { MVP_MODES } from "@repo/domain/marks";
import {
  GAME_CUSTOM_NAME_MAX_LENGTH,
  normalizeGameCustomName,
} from "@repo/domain/game-custom-name";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

const registrationModeSchema = z.enum(["individual", "team_only"]);
const createFormatSchema = z.enum([
  "friendly_game",
  "americano",
  "friendly_tournament",
]);

export const createGameInputSchema = z
  .object({
    name: z.string().trim().max(255).optional(),
    customName: z.string().trim().max(GAME_CUSTOM_NAME_MAX_LENGTH).optional(),
    groupId: z.string().uuid({ message: "Pick a Group" }),
    isPublic: z.boolean(),
    /** False makes the Game Unrated (ADR-0053). */
    rated: z.boolean().optional(),
    format: createFormatSchema.default("friendly_game"),
    registrationMode: registrationModeSchema,
    playersAllowed: z.number().int().optional(),
    teamsAllowed: z.number().int().optional(),
    sideSize: z.number().int().optional(),
    windowStart: z.coerce.date(),
    windowEnd: z.coerce.date(),
    venueId: z.string().uuid({ message: "Pick a Venue" }),
    courtId: z.string().uuid().nullable().optional(),
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
    /** How the MVP is decided; Friendly game only. Omitted = players vote. */
    mvpMode: z.enum(MVP_MODES).optional(),
  })
  .refine((value) => value.windowEnd.getTime() >= value.windowStart.getTime(), {
    message: "Finish time must be at or after start time",
    path: ["windowEnd"],
  })
  .refine(
    (value) =>
      value.format !== "americano" || value.registrationMode === "individual",
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
      message: "Americano players allowed must be a multiple of 4, minimum 4",
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
    if (value.format !== "friendly_game" && value.mvpMode !== undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only a Friendly game has an MVP",
        path: ["mvpMode"],
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
        message: levelRangeInvertedMessage(DEFAULT_LOCALE),
        path: ["levelMinTenths"],
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: levelRangeInvertedMessage(DEFAULT_LOCALE),
        path: ["levelMaxTenths"],
      });
    }
  });

function friendlyGameNameFields(
  input: Pick<CreateGameInput, "name" | "customName">,
) {
  const customName = normalizeGameCustomName(input.customName);
  return customName
    ? { name: customName, hasCustomName: true }
    : { name: input.name, hasCustomName: false };
}

async function createFootballGameOnGroup(
  database: DbClient,
  input: CreateGameInput,
  flags: { rated: boolean; groupRated: boolean },
  locale: Locale = DEFAULT_LOCALE,
) {
  if (input.format !== "friendly_game") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.friendlyOnly,
    });
  }
  // A Level range gates who may join on their Temba Level, so only a Game
  // that counts for it has one (ADR-0069).
  if (
    !flags.rated &&
    (input.levelMinTenths != null || input.levelMaxTenths != null)
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.noLevelRange,
    });
  }
  const sideSize = input.sideSize ?? DEFAULT_FOOTBALL_SIDE_SIZE;
  const created = await createFootballGame(
    database,
    {
      createdBy: input.createdBy,
      ...friendlyGameNameFields(input),
      groupId: input.groupId,
      venueId: input.venueId,
      courtId: input.courtId,
      windowStart: input.windowStart,
      windowEnd: input.windowEnd,
      pricePerPlayerFils: input.pricePerPlayerFils ?? null,
      sideSize,
      playersAllowed: input.playersAllowed ?? 2 * sideSize,
      mvpMode: input.mvpMode,
      levelMinTenths: input.levelMinTenths ?? null,
      levelMaxTenths: input.levelMaxTenths ?? null,
      ...flags,
    },
    locale,
  );
  return { id: created.game.id, matchId: null as string | null };
}

/** A Game may start a little before it is saved, never earlier. */
const WINDOW_START_GRACE_MS = 15 * 60 * 1000;

export async function createGame(
  database: DbClient,
  input: CreateGameInput,
  options: { now?: Date; locale?: Locale } = {},
) {
  const locale = options.locale ?? DEFAULT_LOCALE;
  const now = options.now ?? new Date();
  if (input.windowStart.getTime() < now.getTime() - WINDOW_START_GRACE_MS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(options.locale ?? DEFAULT_LOCALE).game.errors
        .startInPast,
    });
  }
  const created = await createGameOnGroup(database, input, locale);
  await linkNewGameToSeason(database, {
    id: created.id,
    groupId: input.groupId,
    windowStart: input.windowStart,
  });
  return created;
}

async function createGameOnGroup(
  database: DbClient,
  input: CreateGameInput,
  locale: Locale = DEFAULT_LOCALE,
) {
  const group = await requireGroup(database, input.groupId, locale);
  await assertMayCreateGameOnGroup(database, group, input.createdBy, locale);

  const isAmericano = input.format === "americano";
  const isTournament = input.format === "friendly_tournament";
  const { rated, groupRated } = ratingFlagsAtCreate({
    hasGroup: true,
    groupVerified: groupIsVerified(group),
    sport: sportOrDefault(group.sport),
    rated: input.rated ?? true,
  });

  if (sportOrDefault(group.sport) === "football") {
    return createFootballGameOnGroup(
      database,
      input,
      { rated, groupRated },
      locale,
    );
  }

  if (!isAmericano && !isTournament) {
    const created = await createFriendlyGame(
      database,
      {
        createdBy: input.createdBy,
        ...friendlyGameNameFields(input),
        groupId: input.groupId,
        venueId: input.venueId,
        courtId: input.courtId,
        windowStart: input.windowStart,
        windowEnd: input.windowEnd,
        pricePerPlayerFils: input.pricePerPlayerFils ?? null,
        levelMinTenths: input.levelMinTenths ?? null,
        levelMaxTenths: input.levelMaxTenths ?? null,
        rated,
        groupRated,
        mvpMode: input.mvpMode,
      },
      locale,
    );
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
    locale,
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
        groupId: input.groupId,
        venueId: input.venueId,
        isPublic: false,
        windowStart,
        windowEnd,
        playersAllowed,
        teamsAllowed: null,
        pricePerPlayerFils: input.pricePerPlayerFils ?? null,
        levelMinTenths: input.levelMinTenths ?? null,
        levelMaxTenths: input.levelMaxTenths ?? null,
        sport: GameSportEnum.PADEL,
        rated,
        groupRated,
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
  .input(createGameInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createGame(
      ctx.db,
      { ...input, createdBy: appUser.id },
      { locale: ctx.locale },
    );
  });
