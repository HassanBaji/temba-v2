import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";

import { bookings } from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";
import {
  refundForCancellation,
  type RefundPolicy,
} from "@repo/domain/booking-refund";

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
  paymentStatus: (typeof bookings.$inferSelect)["paymentStatus"];
  cancellationPolicy: RefundPolicy;
};

/**
 * The refund arithmetic and the status move shared by the Customer and Venue
 * cancel doors. A Venue cancel refunds in full whatever the policy says; a
 * Booking still pending payment has taken no money, so nothing is due.
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
          paidFils: booking.paymentStatus === "paid" ? booking.priceFils : 0,
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

  return refund;
}
