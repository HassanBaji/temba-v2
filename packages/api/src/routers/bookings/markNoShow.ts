import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings } from "@repo/db";
import { managerBookingActions } from "@repo/domain/booking-manager-actions";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { bookingWithLedger } from "#src/bookings/payments";
import { requireManagedBooking } from "#src/bookings/require-managed-booking";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** Terminal, with no refund; the ledger is left exactly as it was. */
export async function markBookingNoShow(
  database: DbClient,
  args: {
    bookingId: string;
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
    if (!managerBookingActions(booking, venueArchived, now).noShow) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          booking.status === "confirmed"
            ? "A Booking can be marked no-show once it has started"
            : "Only a confirmed Booking can be marked no-show",
      });
    }

    await tx
      .update(bookings)
      .set({ status: "no_show", noShowAt: now, updatedAt: now })
      .where(eq(bookings.id, booking.id));
    return bookingWithLedger(tx, booking.id);
  });
}

export const markNoShowProcedure = protectedProcedure
  .input(z.object({ bookingId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return markBookingNoShow(ctx.db, {
      ...input,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
