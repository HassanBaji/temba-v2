import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { bookings } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  bookingWithLedger,
  enqueueRefundRecorded,
  recordRefund,
  refundableFils,
  refundablePayment,
} from "#src/bookings/payments";
import { enqueue } from "#src/jobs/enqueue";
import { refundJob } from "#src/jobs/specs";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function recordBookingRefund(
  database: DbClient,
  args: {
    bookingId: string;
    amountFils: number;
    reference?: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
    now?: Date;
  },
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
    await requireVenueManager(tx, {
      venueId: booking.venueId,
      ...args.actor,
    });

    const payment = await refundablePayment(tx, booking.id);
    if (!payment) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Nothing has been paid on this Booking",
      });
    }
    if (args.amountFils <= 0 || args.amountFils > refundableFils(payment)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `At most ${refundableFils(payment)} fils can still be refunded`,
      });
    }

    const refundKey = randomUUID();
    if (payment.provider === "manual") {
      await recordRefund(tx, {
        paymentId: payment.id,
        amountFils: args.amountFils,
        reference: args.reference ?? null,
        actorUserId: args.actor.userId,
        now,
      });
      await enqueueRefundRecorded(tx, {
        bookingId: booking.id,
        refundKey,
        amountFils: args.amountFils,
      });
      return {
        ...(await bookingWithLedger(tx, booking.id)),
        refundInProgress: false,
      };
    }

    await enqueue(
      tx,
      refundJob({
        paymentId: payment.id,
        amountFils: args.amountFils,
        reason: "manager",
        requestedByUserId: args.actor.userId,
        refundKey,
      }),
    );
    return {
      ...(await bookingWithLedger(tx, booking.id)),
      refundInProgress: true,
    };
  });
}

export const recordRefundProcedure = protectedProcedure
  .input(
    z.object({
      bookingId: z.string().uuid(),
      amountFils: z.number().int().positive(),
      reference: z.string().trim().min(1).max(255).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return recordBookingRefund(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
