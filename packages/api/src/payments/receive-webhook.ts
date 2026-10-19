import { db as defaultDb, paymentWebhookDeliveries, type Db } from "@repo/db";

import { enqueue } from "#src/jobs/enqueue";
import { processWebhookJob } from "#src/jobs/specs";

import { paymentProvider } from "./index";

export type WebhookReceipt = { status: 200 | 400; reason?: string };

/**
 * The host route's whole job: verify through the adapter, store the delivery
 * and queue its processing in one transaction. No ledger move happens here.
 */
export async function receivePaymentWebhook(
  raw: { provider: string; headers: Headers; body: string },
  database: Db = defaultDb,
): Promise<WebhookReceipt> {
  const provider = paymentProvider();
  if (provider.id !== raw.provider) {
    return { status: 400, reason: "Unknown payment provider" };
  }

  const verified = await provider.verifyWebhook({
    headers: raw.headers,
    body: raw.body,
  });
  if (!verified.ok) {
    console.warn(
      JSON.stringify({
        event: "payment_webhook_rejected",
        provider: provider.id,
        reason: verified.reason,
      }),
    );
    return { status: 400, reason: verified.reason };
  }

  await database.transaction(async (tx) => {
    const [delivery] = await tx
      .insert(paymentWebhookDeliveries)
      .values({
        provider: provider.id,
        deliveryKey: verified.deliveryKey,
        reference: verified.reference,
        body: raw.body,
        headers: Object.fromEntries(raw.headers.entries()),
      })
      .onConflictDoNothing()
      .returning({ id: paymentWebhookDeliveries.id });
    if (delivery) {
      await enqueue(tx, processWebhookJob(delivery.id, verified.deliveryKey));
    }
  });
  return { status: 200 };
}
