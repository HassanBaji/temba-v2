import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings } from "@repo/db";
import { paymentStateFor } from "@repo/domain/booking-payment";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { latestPayment } from "#src/bookings/payments";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function getPaymentState(
  database: DbClient,
  args: { bookingId: string; userId: string; now?: Date },
) {
  const booking = await database.query.bookings.findFirst({
    where: eq(bookings.id, args.bookingId),
    columns: { userId: true, status: true, holdExpiresAt: true },
  });
  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
  if (booking.userId !== args.userId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the holder can see this Booking's payment",
    });
  }

  const payment = await latestPayment(database, args.bookingId);
  return {
    ...paymentStateFor(booking, payment, args.now ?? new Date()),
    method: payment?.method ?? null,
    holdExpiresAt: booking.holdExpiresAt,
  };
}

export const paymentStateProcedure = protectedProcedure
  .input(z.object({ bookingId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return getPaymentState(ctx.db, {
      bookingId: input.bookingId,
      userId: appUser.id,
    });
  });
