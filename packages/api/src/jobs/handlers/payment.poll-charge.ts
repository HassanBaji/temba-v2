import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookingPayments, bookings, type Db } from "@repo/db";

import { applyChargeState } from "#src/bookings/payments";
import { enqueueAt } from "#src/jobs/enqueue";
import {
  JOB,
  MAX_ATTEMPTS,
  POLL_INTERVAL_SECONDS,
  pollChargeJob,
} from "#src/jobs/specs";
import { paymentProvider } from "#src/payments/index";

export const jobName = JOB.pollCharge;
export const payloadSchema = z.object({
  paymentId: z.string().uuid(),
  round: z.number().int().min(0).default(0),
});
export const maxAttempts = MAX_ATTEMPTS.pollCharge;

function delayAfter(round: number) {
  if (round === 0) return POLL_INTERVAL_SECONDS.second;
  return POLL_INTERVAL_SECONDS.steady;
}

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  const payment = await db.query.bookingPayments.findFirst({
    where: eq(bookingPayments.id, payload.paymentId),
  });
  if (payment?.status !== "pending" || !payment.providerReference) {
    return;
  }

  const state = await paymentProvider().retrieve({
    reference: payment.providerReference,
  });

  await db.transaction(async (tx) => {
    await applyChargeState(tx, { paymentId: payment.id, state, now });
    if (state.status !== "pending") {
      return;
    }
    const [booking] = await tx
      .select({
        status: bookings.status,
        holdExpiresAt: bookings.holdExpiresAt,
      })
      .from(bookings)
      .where(eq(bookings.id, payment.bookingId));
    const holdLive =
      booking?.status === "pending_payment" &&
      booking.holdExpiresAt !== null &&
      booking.holdExpiresAt > now;
    if (!holdLive) {
      return;
    }
    await enqueueAt(
      tx,
      pollChargeJob(payment.id, payload.round + 1),
      new Date(now.getTime() + delayAfter(payload.round) * 1000),
    );
  });
}
