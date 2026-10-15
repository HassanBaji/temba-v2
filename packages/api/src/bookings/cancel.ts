import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";
import {
  refundForCancellation,
  type RefundPolicy,
} from "@repo/domain/booking-refund";

import { refundableFils, refundablePayment } from "#src/bookings/payments";
import { removeJob, enqueue } from "#src/jobs/enqueue";
import { expireHoldKey, refundJob } from "#src/jobs/specs";

type DbOrTx = DbClient | DbTx;

const FULL_REFUND: RefundPolicy = {
  tiers: [],
  lateRefundPercent: 100,
  customerCancelUntilMinutes: 0,
};

export type CancellableBooking = {
  id: string;
  startsAt: Date;
  priceFils: number;
  status: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "expired";
  cancellationPolicy: RefundPolicy;
};

/**
 * The refund arithmetic and the status move shared by the Customer and Venue
 * cancel doors. A Venue cancel refunds in full whatever the policy says; a
 * Booking still pending payment has taken no money, so nothing is due. A
 * payment taken online is refunded by a job; a manual one is left on the
 * ledger for the manager, with `refundDueFils` written on the Booking.
 */
export async function cancelBooking(
  database: DbOrTx,
  args: {
    booking: CancellableBooking;
    cancelledBy: "customer" | "venue";
    actorUserId: string;
    reason?: string | null;
    now: Date;
  },
) {
  const { booking, now } = args;

  const payment = await refundablePayment(database, booking.id);

  const refund =
    booking.status === "pending_payment"
      ? { refundDueFils: 0, cancellationChargeFils: 0 }
      : refundForCancellation({
          policy:
            args.cancelledBy === "venue"
              ? FULL_REFUND
              : booking.cancellationPolicy,
          startsAt: booking.startsAt,
          now,
          priceFils: booking.priceFils,
          paidFils: payment ? refundableFils(payment) : 0,
        });

  const [cancelled] = await database
    .update(bookings)
    .set({
      status: "cancelled",
      holdExpiresAt: null,
      cancelledAt: now,
      cancelledByUserId: args.actorUserId,
      cancelledBy: args.cancelledBy,
      cancelReason: args.reason ?? null,
      refundDueFils: refund.refundDueFils,
      cancellationChargeFils: refund.cancellationChargeFils,
      updatedAt: now,
    })
    .where(
      and(
        eq(bookings.id, booking.id),
        inArray(bookings.status, ["confirmed", "pending_payment"]),
      ),
    )
    .returning();
  if (!cancelled) {
    throw new TRPCError({
      code: "CONFLICT",
      message: "This Booking was already changed",
    });
  }

  await removeJob(database, expireHoldKey(booking.id));
  if (payment?.provider === "tap" && refund.refundDueFils > 0) {
    await enqueue(
      database,
      refundJob({
        paymentId: payment.id,
        amountFils: refund.refundDueFils,
        reason:
          args.cancelledBy === "venue" ? "venue_cancel" : "customer_cancel",
        requestedByUserId: args.actorUserId,
        refundKey: `cancel:${booking.id}`,
      }),
    );
  }

  return refund;
}
