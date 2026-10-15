import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { bookings } from "@repo/db";
import { SLOT_REFUSAL_MESSAGES } from "@repo/domain/booking-copy";
import { evaluateSlot } from "@repo/domain/booking-slots";
import { eq } from "drizzle-orm";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadVenueSlotContext,
  requireBookableVenue,
} from "#src/bookings/availability";
import { customerBookingColumns } from "#src/bookings/customer-columns";
import { reserveBooking } from "#src/bookings/reserve";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const MS_PER_MINUTE = 60_000;

export async function createBooking(
  database: DbClient,
  args: {
    venueId: string;
    courtId: string;
    startsAt: Date;
    durationMinutes: number;
    userId: string;
    now?: Date;
  },
) {
  const now = args.now ?? new Date();

  return database.transaction(async (tx) => {
    const context = requireBookableVenue(
      await loadVenueSlotContext(tx, args.venueId, now),
    );

    if (!context.courts.some((court) => court.id === args.courtId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "That Court does not belong to this Venue",
      });
    }

    const check = evaluateSlot(context.input, {
      courtId: args.courtId,
      startsAt: args.startsAt,
      durationMinutes: args.durationMinutes,
    });
    if (!check.ok) {
      throw new TRPCError({
        code: check.reason === "taken" ? "CONFLICT" : "BAD_REQUEST",
        message: SLOT_REFUSAL_MESSAGES[check.reason],
      });
    }

    const bookingId = await reserveBooking(tx, {
      now,
      values: {
        venueId: args.venueId,
        courtId: args.courtId,
        userId: args.userId,
        startsAt: args.startsAt,
        endsAt: new Date(
          args.startsAt.getTime() + args.durationMinutes * MS_PER_MINUTE,
        ),
        status: "confirmed",
        source: "app",
        priceFils: check.priceFils,
        cancellationPolicy: context.venue.cancellationPolicy,
        paymentStatus: "pending",
        createdByUserId: args.userId,
      },
    });

    const [booking] = await tx
      .select(customerBookingColumns)
      .from(bookings)
      .where(eq(bookings.id, bookingId));
    if (!booking) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create Booking",
      });
    }

    return { booking, payment: { kind: "deferred" as const } };
  });
}

export const createProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      courtId: z.string().uuid(),
      startsAt: z.date(),
      durationMinutes: z.number().int().positive(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createBooking(ctx.db, { ...input, userId: appUser.id });
  });
