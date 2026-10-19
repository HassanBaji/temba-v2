import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { bookingPayments, paymentWebhookDeliveries, type Db } from "@repo/db";

import { applyChargeState } from "#src/bookings/payments";
import { JOB, MAX_ATTEMPTS } from "#src/jobs/specs";
import { paymentProvider } from "#src/payments/index";

export const jobName = JOB.processWebhook;
export const payloadSchema = z.object({ deliveryId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.processWebhook;

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  const delivery = await db.query.paymentWebhookDeliveries.findFirst({
    where: eq(paymentWebhookDeliveries.id, payload.deliveryId),
  });
  if (!delivery || delivery.processedAt) {
    return;
  }

  const verified = await paymentProvider().verifyWebhook({
    headers: new Headers(delivery.headers),
    body: delivery.body,
  });
  if (!verified.ok) {
    await db
      .update(paymentWebhookDeliveries)
      .set({ processedAt: now, error: verified.reason.slice(0, 500) })
      .where(eq(paymentWebhookDeliveries.id, delivery.id));
    return;
  }

  const payment = await db.query.bookingPayments.findFirst({
    where: and(
      eq(bookingPayments.provider, delivery.provider),
      eq(bookingPayments.providerReference, verified.reference),
    ),
  });
  if (!payment) {
    // The webhook can outrun create-charge storing the reference; retry.
    throw new Error(`No Payment for charge ${verified.reference} yet`);
  }

  await db.transaction(async (tx) => {
    await applyChargeState(tx, {
      paymentId: payment.id,
      state: verified.state,
      now,
    });
    await tx
      .update(paymentWebhookDeliveries)
      .set({ processedAt: now, error: null })
      .where(eq(paymentWebhookDeliveries.id, delivery.id));
  });
}
