import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings, courts, games } from "@repo/db";
import {
  LEVEL_RANGE_INVERTED_MESSAGE,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
} from "@repo/domain/level-range";
import { PRICE_PER_PLAYER_MAX_FILS } from "@repo/domain/price-per-player";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { createFriendlyGame } from "#src/games/create-friendly";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const levelTenths = z
  .number()
  .int()
  .min(LEVEL_TENTHS_MIN)
  .max(LEVEL_TENTHS_MAX)
  .nullable()
  .optional();

export const createBookingGameInputSchema = z
  .object({
    bookingId: z.string().uuid(),
    name: z.string().trim().max(255).optional(),
    pricePerPlayerFils: z
      .number()
      .int()
      .min(0)
      .max(PRICE_PER_PLAYER_MAX_FILS)
      .nullable()
      .optional(),
    levelMinTenths: levelTenths,
    levelMaxTenths: levelTenths,
  })
  .superRefine((value, ctx) => {
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
    }
  });

type CreateBookingGameInput = z.infer<typeof createBookingGameInputSchema>;

/**
 * A Booking Game (ADR-0029): groupless, unrated and private, on the Booking's
 * Venue, Court and interval. A Booking whose Game was cancelled may get a new
 * one, since cancelling the Game keeps the Court reserved for the holder.
 */
export async function createBookingGame(
  database: DbClient,
  args: CreateBookingGameInput & { userId: string; now?: Date },
) {
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, args.bookingId))
      .for("update");
    if (!booking) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (booking.userId !== args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the holder can create a Game for this Booking",
      });
    }
    if (booking.status !== "confirmed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Only a confirmed Booking can have a Game",
      });
    }
    if (booking.endsAt.getTime() <= now.getTime()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Booking has already ended",
      });
    }
    const court = await tx.query.courts.findFirst({
      where: eq(courts.id, booking.courtId),
      columns: { sport: true },
    });
    if (court?.sport === "football") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Football Games arrive in a later release",
      });
    }
    if (booking.gameId) {
      const linked = await tx.query.games.findFirst({
        where: eq(games.id, booking.gameId),
        columns: { cancelledAt: true },
      });
      if (linked && !linked.cancelledAt) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This Booking already has a Game",
        });
      }
    }

    const created = await createFriendlyGame(tx, {
      createdBy: args.userId,
      name: args.name,
      groupId: null,
      rated: false,
      venueId: booking.venueId,
      courtId: booking.courtId,
      windowStart: booking.startsAt,
      windowEnd: booking.endsAt,
      pricePerPlayerFils: args.pricePerPlayerFils ?? null,
      levelMinTenths: args.levelMinTenths ?? null,
      levelMaxTenths: args.levelMaxTenths ?? null,
    });

    await tx
      .update(bookings)
      .set({ gameId: created.game.id, updatedAt: now })
      .where(eq(bookings.id, booking.id));

    return { gameId: created.game.id, matchId: created.matchId };
  });
}

export const createGameProcedure = protectedProcedure
  .input(createBookingGameInputSchema)
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createBookingGame(ctx.db, { ...input, userId: appUser.id });
  });
