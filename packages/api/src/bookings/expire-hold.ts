import { and, eq } from "drizzle-orm";

import { bookingPayments, bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";

import { expiredAfterCaptureRefundKey } from "#src/bookings/payments";
import { enqueue } from "#src/jobs/enqueue";
import { refundJob } from "#src/jobs/specs";

type DbOrTx = DbClient | DbTx;

/**
 * Expires a Booking whose hold lapsed, and queues a full refund for a charge
 * that was captured after the Booking was lost. A confirmed Booking, or a
 * hold still running, is left alone.
 */
export async function expireLapsedHold(
  database: DbOrTx,
  args: { bookingId: string; now: Date },
) {
  const { now } = args;
  const [booking] = await database
    .select({ status: bookings.status, holdExpiresAt: bookings.holdExpiresAt })
    .from(bookings)
    .where(eq(bookings.id, args.bookingId))
    .for("update");
  if (!booking) {
    return "missing" as const;
  }

  if (booking.status === "pending_payment") {
    if (booking.holdExpiresAt && booking.holdExpiresAt > now) {
      return "still_held" as const;
    }
    await database
      .update(bookings)
      .set({ status: "expired", holdExpiresAt: null, updatedAt: now })
      .where(eq(bookings.id, args.bookingId));
  } else if (booking.status !== "expired") {
    return "unchanged" as const;
  }

  const paid = await database
    .select()
    .from(bookingPayments)
    .where(
      and(
        eq(bookingPayments.bookingId, args.bookingId),
        eq(bookingPayments.status, "paid"),
      ),
    );
  for (const payment of paid) {
    await enqueue(
      database,
      refundJob({
        paymentId: payment.id,
        amountFils: payment.amountFils - payment.refundedFils,
        reason: "expired_after_capture",
        refundKey: expiredAfterCaptureRefundKey(payment.id),
      }),
    );
  }
  return "expired" as const;
}
