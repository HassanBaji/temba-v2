import { eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { z } from "zod";

import { bookingPayments, type Db } from "@repo/db";

import {
  enqueueRefundRecorded,
  markRefundFailed,
  recordRefund,
  refundableFils,
} from "#src/bookings/payments";
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
  ]),
  requestedByUserId: z.string().uuid().optional(),
  refundKey: z.string().min(1),
});
export const maxAttempts = MAX_ATTEMPTS.refund;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  helpers?: Pick<JobHelpers, "job">,
  now: Date = new Date(),
): Promise<void> {
  const payment = await db.query.bookingPayments.findFirst({
    where: eq(bookingPayments.id, payload.paymentId),
  });
  if (
    !payment?.providerReference ||
    (payment.status !== "paid" && payment.status !== "partially_refunded")
  ) {
    return;
  }
  if (payload.amountFils > refundableFils(payment)) {
    await markRefundFailed(db, {
      paymentId: payment.id,
      reason: "Nothing left to refund",
      now,
    });
    return;
  }

  const finalAttempt =
    helpers !== undefined && helpers.job.attempts >= helpers.job.max_attempts;

  let result;
  try {
    result = await paymentProvider().refund({
      reference: payment.providerReference,
      amountFils: payload.amountFils,
      idempotencyKey: payload.refundKey,
    });
  } catch (error) {
    if (finalAttempt) {
      await markRefundFailed(db, {
        paymentId: payment.id,
        reason: "The provider could not be reached",
        now,
      });
    }
    throw error;
  }

  if ("failed" in result) {
    if (!result.retryable) {
      await markRefundFailed(db, {
        paymentId: payment.id,
        reason: result.failed,
        now,
      });
      return;
    }
    if (finalAttempt) {
      await markRefundFailed(db, {
        paymentId: payment.id,
        reason: result.failed,
        now,
      });
    }
    throw new Error(result.failed);
  }

  await db.transaction(async (tx) => {
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
