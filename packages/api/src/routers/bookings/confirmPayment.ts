import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { customerBookingColumns } from "#src/bookings/customer-columns";
import { applyChargeState, latestPayment } from "#src/bookings/payments";
import { paymentProvider } from "#src/payments/index";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function confirmPayment(
  database: DbClient,
  args: { bookingId: string; userId: string; now?: Date },
) {
  const now = args.now ?? new Date();
  const provider = paymentProvider();
  if (provider.id === "manual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Booking is paid at the Venue",
    });
  }

  const booking = await database.query.bookings.findFirst({
    where: eq(bookings.id, args.bookingId),
    columns: { userId: true, status: true },
  });
  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
  if (booking.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the holder can confirm this payment",
    });
  }

  const loadBooking = async () => {
    const [row] = await database
      .select(customerBookingColumns)
      .from(bookings)
      .where(eq(bookings.id, args.bookingId));
    return row!;
  };

  // The webhook or a poll may have won already; that is a finished payment.
  if (booking.status === "confirmed") {
    return loadBooking();
  }
  const payment = await latestPayment(database, args.bookingId);
  if (
    booking.status !== "pending_payment" ||
    payment?.provider !== provider.id ||
    !payment.providerReference
  ) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "There is no payment to confirm for this Booking",
    });
  }

  if (payment.status === "pending") {
    const state = await provider.retrieve({
      reference: payment.providerReference,
    });
    await database.transaction((tx) =>
      applyChargeState(tx, { paymentId: payment.id, state, now }),
    );
  }
  return loadBooking();
}

export const confirmPaymentProcedure = protectedProcedure
  .input(z.object({ bookingId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return confirmPayment(ctx.db, {
      bookingId: input.bookingId,
      userId: appUser.id,
    });
  });
