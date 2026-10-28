import { and, eq, inArray, isNotNull, lt, gt } from "drizzle-orm";
import { z } from "zod";

import {
  bookingPayments,
  bookings,
  paymentWebhookDeliveries,
  type Db,
} from "@repo/db";

import { expireLapsedHold } from "#src/bookings/expire-hold";
import { enqueue } from "#src/jobs/enqueue";
import { JOB, pollChargeJob } from "#src/jobs/specs";

export const jobName = JOB.reconcile;
export const jobKey = "booking:reconcile";
export const crontabLine = `*/15 * * * * ${jobName} ?max=1&jobKey=${jobKey}&jobKeyMode=replace`;

export const payloadSchema = z.object({}).passthrough();
export const maxAttempts = 1;

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
const STALE_HOLD_MINUTES = 2;
const DELIVERY_RETENTION_DAYS = 90;
const LATE_CAPTURE_WINDOW_DAYS = 7;

export async function handle(
  db: Db,
  _payload: z.infer<typeof payloadSchema>,
  _helpers?: unknown,
  now: Date = new Date(),
): Promise<void> {
  const staleBefore = new Date(
    now.getTime() - STALE_HOLD_MINUTES * MS_PER_MINUTE,
  );

  const staleHolds = await db
    .select({ id: bookings.id })
    .from(bookings)
    .where(
      and(
        eq(bookings.status, "pending_payment"),
        lt(bookings.holdExpiresAt, staleBefore),
      ),
    );
  for (const hold of staleHolds) {
    await db.transaction((tx) =>
      expireLapsedHold(tx, { bookingId: hold.id, now }),
    );
  }

  // A charge still pending after its hold may yet be captured; polling it
  // once lets applyChargeState queue the refund.
  const lateWindow = new Date(
    now.getTime() - LATE_CAPTURE_WINDOW_DAYS * MS_PER_DAY,
  );
  const unsettled = await db
    .select({ id: bookingPayments.id })
    .from(bookingPayments)
    .innerJoin(bookings, eq(bookings.id, bookingPayments.bookingId))
    .where(
      and(
        eq(bookingPayments.provider, "tap"),
        eq(bookingPayments.status, "pending"),
        isNotNull(bookingPayments.providerReference),
        gt(bookingPayments.createdAt, lateWindow),
        inArray(bookings.status, ["expired", "cancelled"]),
      ),
    );
  for (const payment of unsettled) {
    await db.transaction((tx) => enqueue(tx, pollChargeJob(payment.id, 0)));
  }

  const pruned = await db
    .delete(paymentWebhookDeliveries)
    .where(
      lt(
        paymentWebhookDeliveries.receivedAt,
        new Date(now.getTime() - DELIVERY_RETENTION_DAYS * MS_PER_DAY),
      ),
    )
    .returning({ id: paymentWebhookDeliveries.id });

  console.log(
    JSON.stringify({
      event: "booking_reconcile",
      expiredHolds: staleHolds.length,
      repolledCharges: unsettled.length,
      prunedDeliveries: pruned.length,
    }),
  );
}
