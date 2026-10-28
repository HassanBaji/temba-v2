import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { managerBookingActions } from "@repo/domain/booking-manager-actions";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { cancelBooking, type CancelledBy } from "#src/bookings/cancel";
import { bookingWithLedger } from "#src/bookings/payments";
import { requireManagedBooking } from "#src/bookings/require-managed-booking";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/**
 * `venue` refunds in full; `customer` records that the Customer asked, so
 * their Cancellation policy sets the refund, with no cut-off for the manager.
 */
export async function cancelBookingForVenue(
  database: DbClient,
  args: {
    bookingId: string;
    cancelledBy: CancelledBy;
    reason?: string;
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
    if (!managerBookingActions(booking, venueArchived, now).cancel) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          booking.status === "confirmed"
            ? "This Booking has ended. Mark it no-show instead"
            : "This Booking can no longer be cancelled",
      });
    }

    await cancelBooking(tx, {
      booking,
      cancelledBy: args.cancelledBy,
      actorUserId: args.actor.userId,
      reason: args.reason,
      now,
    });
    return bookingWithLedger(tx, booking.id);
  });
}

export const cancelForVenueProcedure = protectedProcedure
  .input(
    z.object({
      bookingId: z.string().uuid(),
      cancelledBy: z.enum(["venue", "customer"]).default("venue"),
      reason: z.string().trim().min(1).max(500).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelBookingForVenue(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
