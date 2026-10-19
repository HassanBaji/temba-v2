import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { latestPayment, openPayment } from "#src/bookings/payments";
import { enqueue } from "#src/jobs/enqueue";
import { createChargeJob } from "#src/jobs/specs";
import { paymentProvider } from "#src/payments/index";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function retryPayment(
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
        message: "Only the holder can retry this payment",
      });
    }
    if (
      booking.status !== "pending_payment" ||
      !booking.holdExpiresAt ||
      booking.holdExpiresAt <= now
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Booking is no longer waiting for payment",
      });
    }
    const latest = await latestPayment(tx, booking.id);
    if (latest?.status !== "failed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "The last payment has not failed",
      });
    }

    const payment = await openPayment(tx, {
      bookingId: booking.id,
      provider: provider.id,
      amountFils: booking.priceFils,
      now,
    });
    await enqueue(tx, createChargeJob(payment.id));
    return { payment: { kind: "preparing" as const } };
  });
}

export const retryPaymentProcedure = protectedProcedure
  .input(z.object({ bookingId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return retryPayment(ctx.db, {
      bookingId: input.bookingId,
      userId: appUser.id,
    });
  });
