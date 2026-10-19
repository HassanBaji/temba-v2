import { TRPCError } from "@trpc/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";

import { bookingPayments, bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";
import {
  summarisePaymentStatus,
  type PaymentProviderId,
} from "@repo/domain/booking-payment";

import { enqueue } from "#src/jobs/enqueue";
import {
  bookingConfirmedJob,
  bookingNotificationJob,
  refundJob,
} from "#src/jobs/specs";
import { customerBookingColumns } from "#src/bookings/customer-columns";
import type { ChargeState } from "#src/payments/provider";

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

export function refundableFils(payment: PaymentRow) {
  return payment.amountFils - payment.refundedFils;
}

export async function openPayment(
  database: DbOrTx,
  args: {
    bookingId: string;
    provider: PaymentProviderId;
    amountFils: number;
    now: Date;
  },
) {
  const [payment] = await database
    .insert(bookingPayments)
    .values({
      bookingId: args.bookingId,
      provider: args.provider,
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
  | "noop";

/**
 * The one transition from a provider's charge state into the ledger. Webhook,
 * poll and `confirmPayment` all end here; it only moves a `pending` Payment,
 * so the second and later callers are no-ops.
 */
export async function applyChargeState(
  database: DbOrTx,
  args: { paymentId: string; state: ChargeState; now: Date },
): Promise<ChargeOutcome> {
  const { state, now } = args;
  const [payment] = await database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.id, args.paymentId))
    .for("update");
  if (payment?.status !== "pending") {
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
      status: bookings.status,
      holdExpiresAt: bookings.holdExpiresAt,
    })
    .from(bookings)
    .where(eq(bookings.id, payment.bookingId))
    .for("update");

  let outcome: ChargeOutcome = "noop";
  if (booking?.status === "confirmed") {
    outcome = "confirmed";
  } else if (
    booking?.status === "pending_payment" &&
    booking.holdExpiresAt &&
    booking.holdExpiresAt > now
  ) {
    await confirmHeldBooking(database, { bookingId: payment.bookingId, now });
    outcome = "confirmed";
  } else {
    if (booking?.status === "pending_payment") {
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
        reason: "expired_after_capture",
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
  },
) {
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
          ? "A Payment taken online cannot be settled by hand"
          : "There is no pending Payment to settle",
    });
  }
  if (args.outcome === "paid" && !args.method) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose how the Payment was made",
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
  },
) {
  const [payment] = await database
    .select()
    .from(bookingPayments)
    .where(eq(bookingPayments.id, args.paymentId))
    .for("update");
  if (!payment) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
  }
  if (payment.status !== "paid" && payment.status !== "partially_refunded") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Only a paid Payment can be refunded",
    });
  }
  if (args.amountFils <= 0 || args.amountFils > refundableFils(payment)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That is more than can still be refunded",
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
export async function bookingWithLedger(database: DbOrTx, bookingId: string) {
  const [booking] = await database
    .select(customerBookingColumns)
    .from(bookings)
    .where(eq(bookings.id, bookingId));
  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
  return { ...booking, payments: await listPayments(database, bookingId) };
}
