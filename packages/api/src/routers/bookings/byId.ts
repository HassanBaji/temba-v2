import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings, courts, games, venues } from "@repo/db";
import {
  bookingStatusLabel,
  describeNextRefundStep,
} from "@repo/domain/booking-copy";
import {
  customerMayCancelAt,
  describeCancellationPolicy,
  nextRefundStep,
  refundForCancellation,
  refundPercentAt,
} from "@repo/domain/booking-refund";
import { isOccupyingBooking } from "@repo/domain/booking-slots";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const MS_PER_MINUTE = 60_000;

export async function bookingById(
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

  const booking = await database.query.bookings.findFirst({
    where: eq(bookings.id, args.bookingId),
  });
  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  const isHolder = booking.userId === args.actor.userId;
  if (!isHolder) {
    try {
      await requireVenueManager(database, {
        venueId: booking.venueId,
        ...args.actor,
      });
    } catch {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You can't view this Booking",
      });
    }
  }

  const [venue] = await database
    .select({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      phone: venues.phone,
      logoImageUrl: venues.logoImageUrl,
    })
    .from(venues)
    .where(eq(venues.id, booking.venueId));
  const [court] = await database
    .select({ id: courts.id, name: courts.name })
    .from(courts)
    .where(eq(courts.id, booking.courtId));
  const [game] = booking.gameId
    ? await database
        .select({ id: games.id, name: games.name })
        .from(games)
        .where(eq(games.id, booking.gameId))
    : [];

  const policy = booking.cancellationPolicy;
  const active = isOccupyingBooking(booking, now);
  const paidFils = booking.paymentStatus === "paid" ? booking.priceFils : 0;
  const refundNow = refundForCancellation({
    policy,
    startsAt: booking.startsAt,
    now,
    priceFils: booking.priceFils,
    paidFils,
  });
  const step = nextRefundStep(policy, booking.startsAt, now);

  return {
    id: booking.id,
    startsAt: booking.startsAt,
    endsAt: booking.endsAt,
    status: booking.status,
    statusLabel: bookingStatusLabel(booking.status),
    holdExpiresAt: booking.holdExpiresAt,
    source: booking.source,
    priceFils: booking.priceFils,
    paymentStatus: booking.paymentStatus,
    refundDueFils: booking.refundDueFils,
    cancellationChargeFils: booking.cancellationChargeFils,
    cancelledAt: booking.cancelledAt,
    cancelledBy: booking.cancelledBy,
    cancelReason: booking.cancelReason,
    gameId: booking.gameId,
    game: game ?? null,
    venue: venue!,
    court: court!,
    cancellationPolicy: policy,
    cancellationPolicyLines: describeCancellationPolicy(policy),
    canCreateGame:
      isHolder &&
      booking.status === "confirmed" &&
      booking.endsAt.getTime() > now.getTime() &&
      booking.gameId === null,
    cancel: {
      allowed:
        isHolder &&
        active &&
        customerMayCancelAt(policy, booking.startsAt, now),
      until: new Date(
        booking.startsAt.getTime() -
          policy.customerCancelUntilMinutes * MS_PER_MINUTE,
      ),
      refundPercentNow: refundPercentAt(policy, booking.startsAt, now),
      refundDueFilsNow: refundNow.refundDueFils,
      nextStep: step ? { ...step, text: describeNextRefundStep(step) } : null,
    },
  };
}

export const byIdProcedure = protectedProcedure
  .input(z.object({ bookingId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return bookingById(ctx.db, {
      bookingId: input.bookingId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
