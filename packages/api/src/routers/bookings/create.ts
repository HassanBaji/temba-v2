import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { bookings, user } from "@repo/db";
import type { DbTx } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";
import {
  ONLINE_PAYMENT_METHODS,
  paymentHoldExpiresAt,
  type BookingPaymentMethod,
} from "@repo/domain/booking-payment";
import { slotRefusalMessage } from "@repo/domain/booking-copy";
import { evaluateSlot } from "@repo/domain/booking-slots";
import { and, eq, gt, sql } from "drizzle-orm";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import {
  loadVenueSlotContext,
  requireBookableVenue,
} from "#src/bookings/availability";
import { customerBookingColumns } from "#src/bookings/customer-columns";
import { bookingPaymentMethods } from "#src/bookings/payment-methods";
import { confirmHeldBooking, openPayment } from "#src/bookings/payments";
import { reserveBooking } from "#src/bookings/reserve";
import { enqueue, enqueueAt } from "#src/jobs/enqueue";
import { createChargeJob, expireHoldJob } from "#src/jobs/specs";
import { paymentProvider } from "#src/payments/index";
import { manualProvider } from "#src/payments/manual";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const MS_PER_MINUTE = 60_000;

/**
 * Per Customer and Venue, so one account cannot hold every Court. A hold is
 * a Booking waiting for an online payment; an unpaid pay-at-the-Venue
 * Booking is confirmed with no money taken, so it is capped as well.
 */
export const CUSTOMER_BOOKING_LIMITS = {
  liveHolds: 2,
  unpaidAtVenue: 3,
} as const;

async function requireRoomForCustomer(
  tx: DbTx,
  args: {
    userId: string;
    venueId: string;
    atVenue: boolean;
    now: Date;
    locale: Locale;
  },
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtext(${`booking-limit:${args.userId}:${args.venueId}`}))`,
  );
  const mine = and(
    eq(bookings.userId, args.userId),
    eq(bookings.venueId, args.venueId),
  );
  const m = messagesFor(args.locale).booking.customerLimit;

  if (args.atVenue) {
    const [unpaid] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(bookings)
      .where(
        and(
          mine,
          eq(bookings.source, "app"),
          eq(bookings.status, "confirmed"),
          eq(bookings.paymentStatus, "pending"),
          gt(bookings.endsAt, args.now),
        ),
      );
    const count = unpaid?.count ?? 0;
    if (count >= CUSTOMER_BOOKING_LIMITS.unpaidAtVenue) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: m.unpaidAtVenue(count),
      });
    }
    return;
  }

  const [held] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(bookings)
    .where(
      and(
        mine,
        eq(bookings.status, "pending_payment"),
        gt(bookings.holdExpiresAt, args.now),
      ),
    );
  const count = held?.count ?? 0;
  if (count >= CUSTOMER_BOOKING_LIMITS.liveHolds) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: m.liveHolds(count),
    });
  }
}

export async function createBooking(
  database: DbClient,
  args: {
    venueId: string;
    courtId: string;
    startsAt: Date;
    durationMinutes: number;
    paymentMethod?: BookingPaymentMethod;
    userId: string;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const onlineProvider = paymentProvider();

  return database.transaction(async (tx) => {
    const context = requireBookableVenue(
      await loadVenueSlotContext(tx, args.venueId, now),
      locale,
    );

    if (!context.courts.some((court) => court.id === args.courtId)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).booking.errors.courtNotAtVenue,
      });
    }

    const methods = bookingPaymentMethods({
      provider: onlineProvider,
      payAtVenueAllowed: context.venue.payAtVenueAllowed,
    });
    const method = args.paymentMethod ?? methods[0];
    if (!methods.includes(method)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          method === "at_venue"
            ? messagesFor(locale).booking.errors.onlineOnly
            : messagesFor(locale).booking.errors.payMethodUnavailable,
      });
    }
    const provider = method === "at_venue" ? manualProvider : onlineProvider;

    await requireRoomForCustomer(tx, {
      userId: args.userId,
      venueId: args.venueId,
      atVenue: provider.id === "manual",
      now,
      locale: args.locale ?? DEFAULT_LOCALE,
    });

    const check = evaluateSlot(context.input, {
      courtId: args.courtId,
      startsAt: args.startsAt,
      durationMinutes: args.durationMinutes,
    });
    if (!check.ok) {
      throw new TRPCError({
        code: check.reason === "taken" ? "CONFLICT" : "BAD_REQUEST",
        message: slotRefusalMessage(
          check.reason,
          args.locale ?? DEFAULT_LOCALE,
        ),
      });
    }

    const holdExpiresAt = paymentHoldExpiresAt(now);
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
        status: "pending_payment",
        holdExpiresAt,
        source: "app",
        priceFils: check.priceFils,
        cancellationPolicy: context.venue.cancellationPolicy,
        paymentStatus: "pending",
        createdByUserId: args.userId,
      },
      locale,
    });

    const payment = await openPayment(tx, {
      bookingId,
      provider: provider.id,
      method: method === "at_venue" ? undefined : method,
      amountFils: check.priceFils,
      now,
    });
    await enqueueAt(tx, expireHoldJob(bookingId), holdExpiresAt);

    let paymentKind: "deferred" | "preparing" = "preparing";
    if (provider.id === "manual") {
      const [customer] = await tx
        .select({ name: user.name })
        .from(user)
        .where(eq(user.id, args.userId));
      const begun = await provider.begin({
        paymentId: payment.id,
        bookingId,
        amountFils: check.priceFils,
        customer: { userId: args.userId, name: customer?.name ?? "Customer" },
        returnUrl: "",
      });
      if (begun.kind !== "deferred") {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create Booking",
        });
      }
      await confirmHeldBooking(tx, { bookingId, now });
      paymentKind = "deferred";
    } else {
      await enqueue(tx, createChargeJob(payment.id));
    }

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

    return { booking, payment: { kind: paymentKind } };
  });
}

export const createProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      courtId: z.string().uuid(),
      startsAt: z.date(),
      durationMinutes: z.number().int().positive(),
      paymentMethod: z.enum([...ONLINE_PAYMENT_METHODS, "at_venue"]).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return createBooking(ctx.db, {
      ...input,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
