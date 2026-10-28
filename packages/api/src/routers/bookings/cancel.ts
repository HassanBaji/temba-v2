import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings, venues } from "@repo/db";
import { cancelWindowClosedMessage } from "@repo/domain/booking-copy";
import { customerMayCancelAt } from "@repo/domain/booking-refund";
import { isOccupyingBooking } from "@repo/domain/booking-slots";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { cancelBooking } from "#src/bookings/cancel";
import { customerBookingColumns } from "#src/bookings/customer-columns";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function cancelMyBooking(
  database: DbClient,
  args: { bookingId: string; userId: string; now?: Date },
) {
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    const booking = await tx.query.bookings.findFirst({
      where: eq(bookings.id, args.bookingId),
    });
    if (!booking) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
    }
    if (booking.userId !== args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only the holder can cancel this Booking",
      });
    }
    if (!isOccupyingBooking(booking, now)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Booking can no longer be cancelled",
      });
    }
    if (
      !customerMayCancelAt(booking.cancellationPolicy, booking.startsAt, now)
    ) {
      const venue = await tx.query.venues.findFirst({
        where: eq(venues.id, booking.venueId),
        columns: { phone: true },
      });
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: cancelWindowClosedMessage(venue?.phone ?? null),
      });
    }

    await cancelBooking(tx, {
      booking,
      cancelledBy: "customer",
      actorUserId: args.userId,
      now,
    });

    const [cancelled] = await tx
      .select(customerBookingColumns)
      .from(bookings)
      .where(eq(bookings.id, booking.id));
    return cancelled!;
  });
}

export const cancelProcedure = protectedProcedure
  .input(z.object({ bookingId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return cancelMyBooking(ctx.db, {
      bookingId: input.bookingId,
      userId: appUser.id,
    });
  });
