import { and, eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { z } from "zod";

import { bookingPayments, type Db, type DbTx } from "@repo/db";

import {
  enqueueRefundRecorded,
  markRefundFailed,
  recordRefund,
  refundableFils,
  type PaymentRow,
} from "#src/bookings/payments";
import { logPaymentJobGaveUp } from "#src/jobs/handler";
import { JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { paymentProvider } from "#src/payments/index";

export const jobName = JOB.refund;
export const payloadSchema = z.object({
  paymentId: z.string().uuid(),
  amountFils: z.number().int().positive(),
  reason: z.enum([
    "customer_cancel",
    "venue_cancel",
    "manager",
    "expired_after_capture",
    "captured_after_failure",
  ]),
  requestedByUserId: z.string().uuid().optional(),
  refundKey: z.string().min(1),
});
export const maxAttempts = MAX_ATTEMPTS.refund;

type Payload = z.infer<typeof payloadSchema>;

type Reservation =
  | { kind: "reserved"; payment: PaymentRow }
  | { kind: "not_refundable" }
  | { kind: "too_much"; payment: PaymentRow }
  | { kind: "busy"; payment: PaymentRow };

/**
 * Holds the amount on the locked Payment before the provider is called, so a
 * second refund job sees it as gone. One refund talks to the provider at a
 * time; a retry of the job holding the reservation carries on with it.
 */
async function reserveRefund(db: Db, payload: Payload): Promise<Reservation> {
  return db.transaction(async (tx) => {
    const [payment] = await tx
      .select()
      .from(bookingPayments)
      .where(eq(bookingPayments.id, payload.paymentId))
      .for("update");
    if (
      !payment?.providerReference ||
      (payment.status !== "paid" && payment.status !== "partially_refunded")
    ) {
      return { kind: "not_refundable" };
    }
    if (payment.refundPendingKey === payload.refundKey) {
      return { kind: "reserved", payment };
    }
    if (payload.amountFils > refundableFils(payment)) {
      return { kind: "too_much", payment };
    }
    if (payment.refundPendingKey !== null) {
      return { kind: "busy", payment };
    }
    // updatedAt is left alone: the Venue console reads an unchanged row as
    // a refund still in progress.
    await tx
      .update(bookingPayments)
      .set({
        refundPendingFils: payload.amountFils,
        refundPendingKey: payload.refundKey,
      })
      .where(eq(bookingPayments.id, payment.id));
    return { kind: "reserved", payment };
  });
}

async function releaseRefund(database: Db | DbTx, payload: Payload) {
  await database
    .update(bookingPayments)
    .set({ refundPendingFils: 0, refundPendingKey: null })
    .where(
      and(
        eq(bookingPayments.id, payload.paymentId),
        eq(bookingPayments.refundPendingKey, payload.refundKey),
      ),
    );
}

export async function handle(
  db: Db,
  payload: Payload,
  helpers?: Pick<JobHelpers, "job">,
  now: Date = new Date(),
): Promise<void> {
  const finalAttempt =
    helpers !== undefined && helpers.job.attempts >= helpers.job.max_attempts;

  const giveUp = async (reason: string, error?: unknown) => {
    await db.transaction(async (tx) => {
      await releaseRefund(tx, payload);
      await markRefundFailed(tx, {
        paymentId: payload.paymentId,
        reason,
        now,
      });
    });
    if (error !== undefined) {
      logPaymentJobGaveUp(
        jobName,
        { paymentId: payload.paymentId, refundKey: payload.refundKey },
        error,
      );
    }
  };

  const reservation = await reserveRefund(db, payload);
  if (reservation.kind === "not_refundable") {
    return;
  }
  if (reservation.kind === "too_much") {
    await giveUp("Nothing left to refund");
    return;
  }
  if (reservation.kind === "busy") {
    const error = new Error(
      `Another refund on Payment ${payload.paymentId} is still in progress`,
    );
    if (finalAttempt) {
      await giveUp("Another refund was still in progress", error);
    }
    throw error;
  }
  const { payment } = reservation;

  let result;
  try {
    result = await paymentProvider().refund({
      reference: payment.providerReference!,
      amountFils: payload.amountFils,
      idempotencyKey: payload.refundKey,
    });
  } catch (error) {
    if (finalAttempt) {
      await giveUp("The provider could not be reached", error);
    }
    throw error;
  }

  if ("failed" in result) {
    if (!result.retryable) {
      await giveUp(result.failed);
      return;
    }
    const error = new Error(result.failed);
    if (finalAttempt) {
      await giveUp(result.failed, error);
    }
    throw error;
  }

  await db.transaction(async (tx) => {
    await releaseRefund(tx, payload);
    const bookingId = await recordRefund(tx, {
      paymentId: payment.id,
      amountFils: payload.amountFils,
      reference: result.reference,
      actorUserId: payload.requestedByUserId ?? null,
      now,
    });
    await enqueueRefundRecorded(tx, {
      bookingId,
      refundKey: payload.refundKey,
      amountFils: payload.amountFils,
    });
  });
}
