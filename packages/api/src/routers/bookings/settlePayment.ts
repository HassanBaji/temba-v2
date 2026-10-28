import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings } from "@repo/db";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  bookingWithLedger,
  settlePayment,
  type ManualMethod,
  type SettleOutcome,
} from "#src/bookings/payments";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function settleBookingPayment(
  database: DbClient,
  args: {
    bookingId: string;
    outcome: SettleOutcome;
    method?: ManualMethod;
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
    if (booking.status === "expired" || booking.status === "pending_payment") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This Booking is not awaiting settlement",
      });
    }

    await settlePayment(tx, {
      bookingId: booking.id,
      outcome: args.outcome,
      method: args.method,
      reference: args.reference,
      actorUserId: args.actor.userId,
      amountFils: booking.priceFils,
      now,
    });
    return bookingWithLedger(tx, booking.id);
  });
}

export const settlePaymentProcedure = protectedProcedure
  .input(
    z.object({
      bookingId: z.string().uuid(),
      outcome: z.enum(["paid", "waived", "failed"]),
      method: z.enum(["cash", "card", "benefit", "transfer"]).optional(),
      reference: z.string().trim().min(1).max(255).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return settleBookingPayment(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
