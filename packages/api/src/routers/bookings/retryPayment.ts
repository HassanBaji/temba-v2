import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { bookings } from "@repo/db";
import {
  ONLINE_PAYMENT_METHODS,
  isOnlinePaymentMethod,
  type OnlinePaymentMethod,
} from "@repo/domain/booking-payment";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { type db } from "#src/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { latestPayment, openPayment } from "#src/bookings/payments";
import { enqueue } from "#src/jobs/enqueue";
import { createChargeJob } from "#src/jobs/specs";
import { onlinePaymentMethods, paymentProvider } from "#src/payments/index";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function retryPayment(
  database: DbClient,
  args: {
    bookingId: string;
    userId: string;
    paymentMethod?: OnlinePaymentMethod;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const provider = paymentProvider();
  if (provider.id === "manual") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).booking.errors.paidAtVenue,
    });
  }

  return database.transaction(async (tx) => {
    const [booking] = await tx
      .select()
      .from(bookings)
      .where(eq(bookings.id, args.bookingId))
      .for("update");
    if (!booking) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: messagesFor(locale).booking.errors.notFound,
      });
    }
    if (booking.userId !== args.userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: messagesFor(locale).booking.errors.holderRetries,
      });
    }
    if (
      booking.status !== "pending_payment" ||
      !booking.holdExpiresAt ||
      booking.holdExpiresAt <= now
    ) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).booking.errors.notAwaitingPayment,
      });
    }
    const latest = await latestPayment(tx, booking.id);
    if (latest?.status !== "failed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).booking.errors.lastPaymentNotFailed,
      });
    }

    const method =
      args.paymentMethod ??
      (isOnlinePaymentMethod(latest.method) ? latest.method : undefined);
    if (method && !onlinePaymentMethods().includes(method)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: messagesFor(locale).booking.errors.payMethodUnavailable,
      });
    }

    const payment = await openPayment(tx, {
      bookingId: booking.id,
      provider: provider.id,
      method,
      amountFils: booking.priceFils,
      now,
    });
    await enqueue(tx, createChargeJob(payment.id));
    return { payment: { kind: "preparing" as const } };
  });
}

export const retryPaymentProcedure = protectedProcedure
  .input(
    z.object({
      bookingId: z.string().uuid(),
      paymentMethod: z.enum(ONLINE_PAYMENT_METHODS).optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return retryPayment(ctx.db, {
      bookingId: input.bookingId,
      paymentMethod: input.paymentMethod,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
