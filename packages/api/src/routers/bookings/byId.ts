import { TRPCError } from "@trpc/server";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { bookings, courts, games, user, venues } from "@repo/db";
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
import { managerBookingActions } from "@repo/domain/booking-manager-actions";
import { isOccupyingBooking } from "@repo/domain/booking-slots";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { cancellationRefund } from "#src/bookings/cancel";
import {
  listPayments,
  refundableFils,
  refundablePayment,
} from "#src/bookings/payments";
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
  let isManager = false;
  try {
    await requireVenueManager(database, {
      venueId: booking.venueId,
      ...args.actor,
    });
    isManager = true;
  } catch {
    if (!isHolder) {
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
      archivedAt: venues.archivedAt,
    })
    .from(venues)
    .where(eq(venues.id, booking.venueId));
  const [court] = await database
    .select({ id: courts.id, name: courts.name, sport: courts.sport })
    .from(courts)
    .where(eq(courts.id, booking.courtId));
  const [game] = booking.gameId
    ? await database
        .select({
          id: games.id,
          name: games.name,
          cancelledAt: games.cancelledAt,
        })
        .from(games)
        .where(eq(games.id, booking.gameId))
    : [];

  const [holderUser] =
    isManager && booking.userId
      ? await database
          .select({ id: user.id, name: user.name, image: user.image })
          .from(user)
          .where(eq(user.id, booking.userId))
      : [];
  const payments = isManager ? await listPayments(database, booking.id) : [];
  const actorIds = [
    ...new Set(
      payments.flatMap((payment) =>
        [payment.settledByUserId, payment.refundedByUserId].filter(
          (id): id is string => id !== null,
        ),
      ),
    ),
  ];
  const actorNames = new Map(
    actorIds.length > 0
      ? (
          await database
            .select({ id: user.id, name: user.name })
            .from(user)
            .where(inArray(user.id, actorIds))
        ).map((row) => [row.id, row.name] as const)
      : [],
  );
  const refundSource = isManager
    ? await refundablePayment(database, booking.id)
    : null;

  const hasLiveGame = game?.cancelledAt === null;
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
  const refundIfCancelled = (cancelledBy: "venue" | "customer") =>
    cancellationRefund({
      booking,
      cancelledBy,
      paidFils: refundSource ? refundableFils(refundSource) : 0,
      now,
    }).refundDueFils;

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
    venue: {
      id: venue!.id,
      name: venue!.name,
      city: venue!.city,
      phone: venue!.phone,
      logoImageUrl: venue!.logoImageUrl,
    },
    court: court!,
    cancellationPolicy: policy,
    cancellationPolicyLines: describeCancellationPolicy(policy),
    manager: isManager
      ? {
          holder: holderUser
            ? {
                kind: "user" as const,
                userId: holderUser.id,
                name: holderUser.name,
                image: holderUser.image,
              }
            : {
                kind: "guest" as const,
                name: booking.guestName ?? "",
                phone: booking.guestPhone ?? "",
              },
          managerNotes: booking.managerNotes,
          noShowAt: booking.noShowAt,
          createdAt: booking.createdAt,
          payments: payments.map((payment) => ({
            ...payment,
            settledByName: payment.settledByUserId
              ? (actorNames.get(payment.settledByUserId) ?? null)
              : null,
            refundedByName: payment.refundedByUserId
              ? (actorNames.get(payment.refundedByUserId) ?? null)
              : null,
          })),
          refundableFils: refundSource ? refundableFils(refundSource) : 0,
          actions: managerBookingActions(
            booking,
            venue!.archivedAt !== null,
            now,
          ),
          refundIfCancelled: {
            venue: refundIfCancelled("venue"),
            customer: refundIfCancelled("customer"),
          },
        }
      : null,
    canCreateGame:
      isHolder &&
      booking.status === "confirmed" &&
      booking.endsAt.getTime() > now.getTime() &&
      !hasLiveGame &&
      court!.sport === "padel",
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
