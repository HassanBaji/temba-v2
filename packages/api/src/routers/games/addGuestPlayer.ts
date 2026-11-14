import { TRPCError } from "@trpc/server";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { z } from "zod";

import { user } from "@repo/db";
import { UNCLAIMED_PLAYER_NAME_MAX_LENGTH } from "@repo/domain/add-player-by-phone";
import { isFootballGame } from "@repo/domain/game-shape";
import {
  footballPositionSchema,
  footballRoleSchema,
} from "@repo/validators/football";
import { messagesFor } from "@repo/i18n/messages";
import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  enforceUserRateLimit,
  userRateLimits,
} from "#src/rate-limit/user-rate-limits";
import { type db } from "#src/db";
import {
  assertGameOrganizer,
  requireGame,
  requireNotChallengeGame,
} from "#src/games/access";
import { assertOrganizerAddFormat } from "#src/games/assert-organizer-add-format";
import {
  type FootballPlacement,
  organizerAddPlayer,
} from "#src/games/organizer-add-player";
import type { SeatPosition } from "#src/games/utils";

type DbClient = typeof db;

/**
 * Seats a Guest player: a name only, on this one Game (ADR-0079). The row
 * has no phone, email or Rating, so it is never claimed, found or notified,
 * and a Rated Match counts it at the mean of the other players.
 */
export async function addGuestPlayer(
  database: DbClient,
  args: {
    gameId: string;
    organizerUserId: string;
    name: string;
    seat?: { sideIndex: number; position: SeatPosition };
    side?: { sideIndex: number };
    football?: FootballPlacement;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const game = await requireGame(database, args.gameId, locale);
  requireNotChallengeGame(game, locale);
  await assertGameOrganizer(database, game, args.organizerUserId, locale);
  assertOrganizerAddFormat(game, locale);
  if (args.football && !isFootballGame(game)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).football.errors.roleOnFootball,
    });
  }
  const football: FootballPlacement | null = isFootballGame(game)
    ? (args.football ?? { role: "outfield", position: null })
    : null;
  const name = args.name.trim();
  if (!name) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).profile.errors.enterTheirName,
    });
  }

  return database.transaction(async (tx) => {
    const now = new Date();
    const [guest] = await tx
      .insert(user)
      .values({
        name,
        addedByUserId: args.organizerUserId,
        addedAt: now,
        guestAt: now,
      })
      .returning({ id: user.id, name: user.name });
    if (!guest) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: messagesFor(locale).game.errors.guestNotAdded,
      });
    }

    await organizerAddPlayer(tx, {
      game,
      player: guest,
      organizerUserId: args.organizerUserId,
      placement: args,
      football,
      notifyPlayer: false,
      locale,
    });

    return { userId: guest.id, name: guest.name };
  });
}

export const addGuestPlayerProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      name: z.string().trim().min(1).max(UNCLAIMED_PLAYER_NAME_MAX_LENGTH),
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
    return addGuestPlayer(ctx.db, {
      ...input,
      organizerUserId: appUser.id,
      locale: ctx.locale,
    });
  });
