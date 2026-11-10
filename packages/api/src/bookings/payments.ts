import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { bookingPayments, bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";
import {
  summarisePaymentStatus,
  type OnlinePaymentMethod,
  type PaymentProviderId,
} from "@repo/domain/booking-payment";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { enqueue } from "#src/jobs/enqueue";
import {
  bookingConfirmedJob,
  bookingNotificationJob,
  refundJob,
} from "#src/jobs/specs";
import { customerBookingColumns } from "#src/bookings/customer-columns";
import { requireFreeCourt } from "#src/bookings/reserve";
import { PAYMENT_CURRENCY, type ChargeState } from "#src/payments/provider";

type DbOrTx = DbClient | DbTx;

export type PaymentRow = typeof bookingPayments.$inferSelect;
export type SettleOutcome = "paid" | "waived" | "failed";
export type ManualMethod = NonNullable<PaymentRow["method"]>;

export const expiredAfterCaptureRefundKey = (paymentId: string) =>
  `expired-after-capture:${paymentId}`;

/** Re-derives `bookings.payment_status` from the ledger (invariant 11). */
async function syncBookingPaymentStatus(
  database: DbOrTx,
  bookingId: string,
  now: Date,
) {
  const rows = await database
    .select({
      status: bookingPayments.status,
      createdAt: bookingPayments.createdAt,
    })
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingId, bookingId))
    .orderBy(asc(bookingPayments.createdAt));
  await database
    .update(bookings)
    .set({ paymentStatus: summarisePaymentStatus(rows), updatedAt: now })
    .where(eq(bookings.id, bookingId));
}

export async function listPayments(database: DbOrTx, bookingId: string) {
  return database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingId, bookingId))
    .orderBy(asc(bookingPayments.createdAt));
}

export async function latestPayment(database: DbOrTx, bookingId: string) {
  const [row] = await database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.bookingId, bookingId))
    .orderBy(desc(bookingPayments.createdAt))
    .limit(1);
  return row ?? null;
}

/** The one Payment that holds money: `paid` or partly refunded. */
export async function refundablePayment(database: DbOrTx, bookingId: string) {
  const [row] = await database
    .select()
    .from(bookingPayments)
    .where(
      and(
        eq(bookingPayments.bookingId, bookingId),
        inArray(bookingPayments.status, ["paid", "partially_refunded"]),
      ),
    )
    .orderBy(desc(bookingPayments.createdAt))
    .limit(1);
  return row ?? null;
}

/** What can still be refunded, less any refund a job is sending to the provider now. */
export function refundableFils(payment: PaymentRow) {
  return payment.amountFils - payment.refundedFils - payment.refundPendingFils;
}

export async function openPayment(
  database: DbOrTx,
  args: {
    bookingId: string;
    provider: PaymentProviderId;
    method?: OnlinePaymentMethod;
    amountFils: number;
    now: Date;
  },
) {
  const [payment] = await database
    .insert(bookingPayments)
    .values({
      bookingId: args.bookingId,
      provider: args.provider,
      method: args.method,
      amountFils: args.amountFils,
      createdAt: args.now,
      updatedAt: args.now,
    })
    .returning();
  await syncBookingPaymentStatus(database, args.bookingId, args.now);
  return payment!;
}

/** A Booking leaves `pending_payment` for `confirmed`; the hold no longer applies. */
export async function confirmHeldBooking(
  database: DbOrTx,
  args: { bookingId: string; now: Date },
) {
  const [confirmed] = await database
    .update(bookings)
    .set({ status: "confirmed", holdExpiresAt: null, updatedAt: args.now })
    .where(
      and(
        eq(bookings.id, args.bookingId),
        eq(bookings.status, "pending_payment"),
      ),
    )
    .returning();
  if (confirmed) {
    await enqueue(database, bookingConfirmedJob(args.bookingId));
  }
  return Boolean(confirmed);
}

export async function failPayment(
  database: DbOrTx,
  args: {
    paymentId: string;
    reason: string;
    providerStatus?: string;
    now: Date;
  },
) {
  const [failed] = await database
    .update(bookingPayments)
    .set({
      status: "failed",
      failureReason: args.reason.slice(0, 500),
      providerStatus: args.providerStatus ?? undefined,
      updatedAt: args.now,
    })
    .where(
      and(
        eq(bookingPayments.id, args.paymentId),
        eq(bookingPayments.status, "pending"),
      ),
    )
    .returning();
  if (failed) {
    await syncBookingPaymentStatus(database, failed.bookingId, args.now);
  }
  return Boolean(failed);
}

export type ChargeOutcome =
  | "confirmed"
  | "refund_queued"
  | "failed"
  | "pending"
  | "mismatch"
  | "noop";

/** Allows for the provider's clock running a little ahead of ours. */
const CAPTURE_GRACE_MS = 60_000;

function chargeMismatch(payment: PaymentRow, state: ChargeState) {
  return (
    state.charged !== undefined &&
    (state.charged.amountFils !== payment.amountFils ||
      state.charged.currency !== PAYMENT_CURRENCY)
  );
}

/** Logs a capture for the wrong amount or currency and leaves it for a person to review. */
async function holdMismatchedCharge(
  database: DbOrTx,
  args: { payment: PaymentRow; state: ChargeState; now: Date },
) {
  const { payment, state, now } = args;
  const chargedFils = state.charged?.amountFils ?? null;
  const chargedCurrency = state.charged?.currency ?? null;
  console.error(
    JSON.stringify({
      event: "payment_charge_mismatch",
      paymentId: payment.id,
      bookingId: payment.bookingId,
      providerReference: payment.providerReference,
      expectedFils: payment.amountFils,
      expectedCurrency: PAYMENT_CURRENCY,
      chargedFils,
      chargedCurrency,
      providerStatus: state.providerStatus,
    }),
  );
  if (payment.status !== "pending") {
    return;
  }
  await database
    .update(bookingPayments)
    .set({
      providerStatus: "AMOUNT_MISMATCH",
      failureReason: `Charged ${chargedFils} fils ${chargedCurrency}, expected ${payment.amountFils} fils ${PAYMENT_CURRENCY}`,
      updatedAt: now,
    })
    .where(eq(bookingPayments.id, payment.id));
}

async function courtStillFree(
  database: DbOrTx,
  booking: { id: string; courtId: string; startsAt: Date; endsAt: Date },
  now: Date,
  locale: Locale = DEFAULT_LOCALE,
) {
  try {
    await requireFreeCourt(database, {
      courtId: booking.courtId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      now,
      excludeBookingId: booking.id,
      locale,
    });
    return true;
  } catch (error) {
    if (error instanceof TRPCError && error.code === "CONFLICT") {
      return false;
    }
    throw error;
  }
}

/**
 * The one transition from a provider's charge state into the ledger. Webhook,
 * poll and `confirmPayment` all end here; it moves a `pending` Payment, so
 * the second and later callers are no-ops. A capture that lands on a
 * `failed` Payment is recorded too, so the money is either kept for the
 * Booking or refunded.
 */
export async function applyChargeState(
  database: DbOrTx,
  args: { paymentId: string; state: ChargeState; now: Date; locale?: Locale },
): Promise<ChargeOutcome> {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const { state, now } = args;
  const [payment] = await database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.id, args.paymentId))
    .for("update");
  if (!payment) {
    return "noop";
  }
  const lateCapture = state.status === "paid" && payment.status === "failed";
  if (payment.status !== "pending" && !lateCapture) {
    return "noop";
  }

  if (state.status === "pending") {
    await database
      .update(bookingPayments)
      .set({ providerStatus: state.providerStatus, updatedAt: now })
      .where(eq(bookingPayments.id, payment.id));
    return "pending";
  }

  if (state.status === "failed") {
    await failPayment(database, {
      paymentId: payment.id,
      reason: state.reason ?? state.providerStatus,
      providerStatus: state.providerStatus,
      now,
    });
    return "failed";
  }

  if (chargeMismatch(payment, state)) {
    await holdMismatchedCharge(database, { payment, state, now });
    return "mismatch";
  }

  await database
    .update(bookingPayments)
    .set({
      status: "paid",
      method: state.method ?? payment.method,
      providerStatus: state.providerStatus,
      settledAt: now,
      updatedAt: now,
    })
    .where(eq(bookingPayments.id, payment.id));

  const [booking] = await database
    .select({
      id: bookings.id,
      courtId: bookings.courtId,
      startsAt: bookings.startsAt,
      endsAt: bookings.endsAt,
      status: bookings.status,
      holdExpiresAt: bookings.holdExpiresAt,
    })
    .from(bookings)
    .where(eq(bookings.id, payment.bookingId))
    .for("update");

  // The hold is judged at the capture, not when this job happens to run. A
  // hold that has lapsed since no longer occupies the Court, so someone else
  // may have booked it in the meantime.
  const capturedAt =
    state.capturedAt && state.capturedAt < now ? state.capturedAt : now;
  const holdLiveNow =
    booking?.holdExpiresAt != null && booking.holdExpiresAt > now;
  const heldAtCapture =
    booking?.status === "pending_payment" &&
    booking.holdExpiresAt !== null &&
    booking.holdExpiresAt.getTime() + CAPTURE_GRACE_MS > capturedAt.getTime();
  const latest = await latestPayment(database, payment.bookingId);

  let outcome: ChargeOutcome = "noop";
  if (booking?.status === "confirmed" && !lateCapture) {
    outcome = "confirmed";
  } else if (
    booking &&
    heldAtCapture &&
    latest?.id === payment.id &&
    (holdLiveNow || (await courtStillFree(database, booking, now, locale)))
  ) {
    await confirmHeldBooking(database, { bookingId: payment.bookingId, now });
    outcome = "confirmed";
  } else {
    if (booking?.status === "pending_payment" && !holdLiveNow) {
      await database
        .update(bookings)
        .set({ status: "expired", holdExpiresAt: null, updatedAt: now })
        .where(eq(bookings.id, payment.bookingId));
    }
    await enqueue(
      database,
      refundJob({
        paymentId: payment.id,
        amountFils: payment.amountFils,
        reason: lateCapture
          ? "captured_after_failure"
          : "expired_after_capture",
        refundKey: expiredAfterCaptureRefundKey(payment.id),
      }),
    );
    outcome = "refund_queued";
  }

  await syncBookingPaymentStatus(database, payment.bookingId, now);
  return outcome;
}

export async function settlePayment(
  database: DbOrTx,
  args: {
    bookingId: string;
    outcome: SettleOutcome;
    method?: ManualMethod;
    reference?: string;
    actorUserId: string;
    amountFils: number;
    now: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const { now } = args;
  const payment =
    (await latestPayment(database, args.bookingId)) ??
    (await openPayment(database, {
      bookingId: args.bookingId,
      provider: "manual",
      amountFils: args.amountFils,
      now,
    }));

  const tapFailedBeingWaived =
    payment.provider === "tap" &&
    payment.status === "failed" &&
    args.outcome === "waived";
  const manualPending =
    payment.provider === "manual" && payment.status === "pending";
  if (!tapFailedBeingWaived && !manualPending) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message:
        payment.provider === "tap"
          ? messagesFor(locale).booking.errors.onlineNotSettled
          : messagesFor(locale).booking.errors.noPendingPayment,
    });
  }
  if (args.outcome === "paid" && !args.method) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).booking.errors.choosePaymentMethod,
    });
  }

  await database
    .update(bookingPayments)
    .set({
      status: args.outcome,
      method: args.outcome === "paid" ? args.method : payment.method,
      providerReference: args.reference ?? payment.providerReference,
      settledByUserId: args.actorUserId,
      settledAt: now,
      updatedAt: now,
    })
    .where(eq(bookingPayments.id, payment.id));
  await syncBookingPaymentStatus(database, args.bookingId, now);
}

/** Records money that has gone back to the Customer against a Payment. */
export async function recordRefund(
  database: DbOrTx,
  args: {
    paymentId: string;
    amountFils: number;
    reference: string | null;
    actorUserId: string | null;
    now: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const [payment] = await database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.id, args.paymentId))
    .for("update");
  if (!payment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).booking.errors.paymentNotFound,
    });
  }
  if (payment.status !== "paid" && payment.status !== "partially_refunded") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).booking.errors.refundPaidOnly,
    });
  }
  if (args.amountFils <= 0 || args.amountFils > refundableFils(payment)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).booking.errors.refundTooMuch,
    });
  }

  const refundedFils = payment.refundedFils + args.amountFils;
  await database
    .update(bookingPayments)
    .set({
      refundedFils,
      status:
        refundedFils === payment.amountFils ? "refunded" : "partially_refunded",
      refundReference: args.reference ?? payment.refundReference,
      refundedByUserId: args.actorUserId,
      refundedAt: args.now,
      refundFailureReason: null,
      updatedAt: args.now,
    })
    .where(eq(bookingPayments.id, payment.id));
  await syncBookingPaymentStatus(database, payment.bookingId, args.now);
  return payment.bookingId;
}

export async function markRefundFailed(
  database: DbOrTx,
  args: { paymentId: string; reason: string; now: Date },
) {
  await database
    .update(bookingPayments)
    .set({
      refundFailureReason: args.reason.slice(0, 500),
      updatedAt: args.now,
    })
    .where(eq(bookingPayments.id, args.paymentId));
}

export async function enqueueRefundRecorded(
  database: DbOrTx,
  args: { bookingId: string; refundKey: string; amountFils: number },
) {
  await enqueue(
    database,
    bookingNotificationJob({
      type: "booking_refund_recorded",
      bookingId: args.bookingId,
      dedupe: args.refundKey,
      amountFils: args.amountFils,
    }),
  );
}

/** The Booking and every Payment attempt, as the manager doors return them. */
export async function bookingWithLedger(
  database: DbOrTx,
  bookingId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const [booking] = await database
    .select(customerBookingColumns)
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!booking) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).booking.errors.notFound,
    });
  }
  return { ...booking, payments: await listPayments(database, bookingId) };
}
