import { eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { z } from "zod";

import { bookingPayments, bookings, user, type Db } from "@repo/db";
import { isOnlinePaymentMethod } from "@repo/domain/booking-payment";

import { failPayment } from "#src/bookings/payments";
import { enqueueAt } from "#src/jobs/enqueue";
import {
  JOB,
  MAX_ATTEMPTS,
  POLL_INTERVAL_SECONDS,
  pollChargeJob,
} from "#src/jobs/specs";
import { paymentProvider } from "#src/payments/index";

export const jobName = JOB.createCharge;
export const payloadSchema = z.object({ paymentId: z.string().uuid() });
export const maxAttempts = MAX_ATTEMPTS.createCharge;

function returnUrlFor(bookingId: string) {
  const origin = process.env.API_PUBLIC_URL ?? "";
  return `${origin}/payments/return?bookingId=${bookingId}`;
}

export async function handle(
  db: Db,
  payload: z.infer<typeof payloadSchema>,
  helpers?: Pick<JobHelpers, "job">,
  now: Date = new Date(),
): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      const [payment] = await tx
        .select()
        .from(bookingPayments)
        .where(eq(bookingPayments.id, payload.paymentId))
        .for("update");
      if (payment?.status !== "pending" || payment.providerReference) {
        return;
      }
      const [booking] = await tx
        .select({
          id: bookings.id,
          userId: bookings.userId,
          status: bookings.status,
        })
        .from(bookings)
        .where(eq(bookings.id, payment.bookingId));
      if (booking?.status !== "pending_payment" || !booking.userId) {
        return;
      }
      const [customer] = await tx
        .select({
          name: user.name,
          email: user.email,
          phone: user.phoneNumber,
        })
        .from(user)
        .where(eq(user.id, booking.userId));

      // A worker configured for another provider would otherwise finish the
      // job without a charge and leave the Customer on "Preparing payment".
      const provider = paymentProvider();
      if (provider.id !== payment.provider) {
        throw new Error(
          `Payment ${payment.id} is for ${payment.provider} but this worker uses ${provider.id}`,
        );
      }
      const begun = await provider.begin({
        paymentId: payment.id,
        bookingId: booking.id,
        amountFils: payment.amountFils,
        method: isOnlinePaymentMethod(payment.method)
          ? payment.method
          : undefined,
        customer: {
          userId: booking.userId,
          name: customer?.name ?? "Customer",
          email: customer?.email ?? undefined,
          phone: customer?.phone ?? undefined,
        },
        returnUrl: returnUrlFor(booking.id),
      });

      if (begun.kind === "failed") {
        await failPayment(tx, {
          paymentId: payment.id,
          reason: begun.reason,
          now,
        });
        return;
      }
      if (begun.kind === "redirect") {
        await tx
          .update(bookingPayments)
          .set({
            providerReference: begun.reference,
            clientRedirectUrl: begun.redirectUrl,
            providerStatus: "INITIATED",
            updatedAt: now,
          })
          .where(eq(bookingPayments.id, payment.id));
        await enqueueAt(
          tx,
          pollChargeJob(payment.id, 0),
          new Date(now.getTime() + POLL_INTERVAL_SECONDS.first * 1000),
        );
      }
    });
  } catch (error) {
    if (helpers && helpers.job.attempts >= helpers.job.max_attempts) {
      await failPayment(db, {
        paymentId: payload.paymentId,
        reason: "Payment could not be started",
        now,
      });
    }
    throw error;
  }
}
