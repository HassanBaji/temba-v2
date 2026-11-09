import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { z } from "zod";

import { ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL } from "@repo/domain/add-player-by-phone";
import {
  FOOTBALL_SELF_PLACEMENTS,
  type FootballSelfPlacement,
} from "@repo/domain/football-self-placement";
import { isFootballGame } from "@repo/domain/game-shape";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import type { PadelLevelChoice } from "@repo/domain/onboarding-answers";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  type GameRow,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import {
  type FootballPlacement,
  organizerAddPlayer,
} from "#src/games/organizer-add-player";
import type { SeatPosition } from "#src/games/utils";
import {
  createUnclaimedPlayer,
  type UnclaimedPlayerStartingLevel,
} from "#src/unclaimed-players/create-unclaimed-player";
import { requireE164 } from "#src/unclaimed-players/require-e164";
import { resolvePhonePlayer } from "#src/unclaimed-players/resolve-phone-player";

type DbClient = typeof db;

type AddPlayerLevel = PadelLevelChoice | "not_sure" | FootballSelfPlacement;

function isFootballPlacement(
  level: AddPlayerLevel,
): level is FootballSelfPlacement {
  return (FOOTBALL_SELF_PLACEMENTS as readonly string[]).includes(level);
}

function refuse(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

function startingLevelFor(
  game: GameRow,
  level: AddPlayerLevel | undefined,
): UnclaimedPlayerStartingLevel {
  if (isFootballGame(game)) {
    if (level !== undefined && !isFootballPlacement(level)) {
      refuse("Pick a football Level");
    }
    return {
      sport: "football",
      placement: level ?? ADD_PLAYER_DEFAULT_FOOTBALL_LEVEL,
    };
  }
  if (level !== undefined && isFootballPlacement(level)) {
    refuse("Pick a padel Level");
  }
  return { sport: "padel", level: level ?? "not_sure" };
}

export async function addPlayerByPhone(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    countryIso: string;
    nationalNumber: string;
    name?: string;
    level?: AddPlayerLevel;
    seat?: { sideIndex: number; position: SeatPosition };
    side?: { sideIndex: number };
    football?: FootballPlacement;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.organizerUserId);
  assertOrganizerAddFormat(game);
  if (args.football && !isFootballGame(game)) {
    refuse("Only a football Game takes a role and position");
  }
  const football: FootballPlacement | null = isFootballGame(game)
    ? (args.football ?? { role: "outfield", position: null })
    : null;
  const startingLevel = startingLevelFor(game, args.level);
  const phoneNumber = requireE164(args.countryIso, args.nationalNumber);
  const name = args.name?.trim();

  return database.transaction(async (tx) => {
    const resolved = await resolvePhonePlayer(tx, phoneNumber);
    let player;
    if (resolved.kind === "new") {
      if (!name) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Enter their name",
        });
      }
      ({ user: player } = await createUnclaimedPlayer(tx, {
        phoneNumber,
        name,
        addedByUserId: args.organizerUserId,
        startingLevel,
      }));
    } else {
      player = resolved.user;
    }

    await organizerAddPlayer(tx, {
      game,
      player,
      organizerUserId: args.organizerUserId,
      placement: args,
      football,
      notifyPlayer: resolved.kind === "account",
      locale,
    });

    return {
      userId: player.id,
      kind: resolved.kind,
      name: player.name,
    };
  });
}

export const addPlayerByPhoneProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      countryIso: z.string().trim().min(1).max(8),
      nationalNumber: z.string().trim().min(1).max(32),
      name: z.string().trim().min(1).max(100).optional(),
      level: z
        .union([
          z.enum(ASSIGNABLE_DISPLAY_LEVEL_BANDS),
          z.literal("not_sure"),
          z.enum(FOOTBALL_SELF_PLACEMENTS),
        ])
        .optional(),
      seat: z
        .object({
          sideIndex: z.number().int().min(1),
          position: z.enum(["left", "right"]),
        })
        .optional(),
      side: z.object({ sideIndex: z.number().int().min(1) }).optional(),
      football: z
        .object({
          role: footballRoleSchema,
          position: footballPositionSchema.nullable(),
        })
        .optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    enforceUserRateLimit(userRateLimits.addByPhone, ctx.userId, ctx.locale);
    const appUser = await resolveAppUser(ctx.userId);
    return addPlayerByPhone(ctx.db, {
      ...input,
      organizerUserId: appUser.id,
      locale: ctx.locale,
    });
  });
