import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookingPayments, bookings, games } from "@repo/db";
import { SLOT_REFUSAL_MESSAGES } from "@repo/domain/booking-copy";
import { managerBookingActions } from "@repo/domain/booking-manager-actions";
import { evaluateSlot } from "@repo/domain/booking-slots";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { loadVenueSlotContext } from "#src/bookings/availability";
import { bookingWithLedger, latestPayment } from "#src/bookings/payments";
import { requireFreeCourt } from "#src/bookings/reserve";
import { requireManagedBooking } from "#src/bookings/require-managed-booking";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const MS_PER_MINUTE = 60_000;

function clearedIfBlank(notes: string | null) {
  const trimmed = notes?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A move is checked like a manager create and repriced from the rules unless
 * a price is typed. The Cancellation policy snapshot never changes, and the
 * price only changes while the payment is still pending.
 */
export async function updateBookingForVenue(
  database: DbClient,
  args: {
    bookingId: string;
    courtId?: string;
    startsAt?: Date;
    durationMinutes?: number;
    priceFils?: number;
    managerNotes?: string | null;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    now?: Date;
  },
) {
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    const { booking, venueArchived } = await requireManagedBooking(tx, args);
    if (!managerBookingActions(booking, venueArchived, now).edit) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: venueArchived
          ? "This Venue is archived"
          : "Only a confirmed Booking that has not ended can be edited",
      });
    }

    const courtId = args.courtId ?? booking.courtId;
    const startsAt = args.startsAt ?? booking.startsAt;
    const durationMinutes =
      args.durationMinutes ??
      Math.round(
        (booking.endsAt.getTime() - booking.startsAt.getTime()) / MS_PER_MINUTE,
      );
    const endsAt = new Date(
      startsAt.getTime() + durationMinutes * MS_PER_MINUTE,
    );
    const moved =
      courtId !== booking.courtId ||
      startsAt.getTime() !== booking.startsAt.getTime() ||
      endsAt.getTime() !== booking.endsAt.getTime();

    let priceFils = args.priceFils ?? booking.priceFils;
    if (moved) {
      if (booking.gameId) {
        const game = await tx.query.games.findFirst({
          where: eq(games.id, booking.gameId),
          columns: { cancelledAt: true },
        });
        if (game && !game.cancelledAt) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A Game is planned on this Booking. Cancel the Game first",
          });
        }
      }

      const context = await loadVenueSlotContext(tx, booking.venueId, now, {
        excludeBookingId: booking.id,
      });
      if (!context?.courts.some((court) => court.id === courtId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That Court does not belong to this Venue",
        });
      }
      const check = evaluateSlot(
        context.input,
        { courtId, startsAt, durationMinutes },
        "manager",
      );
      if (check.ok) {
        priceFils = args.priceFils ?? check.priceFils;
      } else if (check.reason !== "no_price" || args.priceFils === undefined) {
        throw new TRPCError({
          code: check.reason === "taken" ? "CONFLICT" : "BAD_REQUEST",
          message:
            check.reason === "no_price"
              ? "No Pricing rule covers that time. Type a price"
              : SLOT_REFUSAL_MESSAGES[check.reason],
        });
      }
      await requireFreeCourt(tx, {
        courtId,
        startsAt,
        endsAt,
        now,
        excludeBookingId: booking.id,
      });
    }

    if (priceFils !== booking.priceFils) {
      if (booking.paymentStatus !== "pending") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            args.priceFils === undefined
              ? `The payment is settled, so the price stays ${formatBookingPriceFils(booking.priceFils)}. Type it as the price to move this Booking`
              : "The payment is settled, so the price cannot change",
        });
      }
      const payment = await latestPayment(tx, booking.id);
      if (payment?.provider === "manual" && payment.status === "pending") {
        await tx
          .update(bookingPayments)
          .set({ amountFils: priceFils, updatedAt: now })
          .where(eq(bookingPayments.id, payment.id));
      }
    }

    await tx
      .update(bookings)
      .set({
        courtId,
        startsAt,
        endsAt,
        priceFils,
        managerNotes:
          args.managerNotes === undefined
            ? booking.managerNotes
            : clearedIfBlank(args.managerNotes),
        updatedAt: now,
      })
      .where(eq(bookings.id, booking.id));
    return bookingWithLedger(tx, booking.id);
  });
}

export const updateProcedure = protectedProcedure
  .input(
    z.object({
      bookingId: z.string().uuid(),
      courtId: z.string().uuid().optional(),
      startsAt: z.date().optional(),
      durationMinutes: z.number().int().positive().optional(),
      priceFils: z.number().int().min(0).max(10_000_000).optional(),
      managerNotes: z.string().max(1000).nullable().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateBookingForVenue(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
