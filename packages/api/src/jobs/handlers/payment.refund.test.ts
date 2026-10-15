import { eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  expectLedgerConsistent,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { handle } from "./payment.refund";

const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe("payment.refund", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  async function paidCharge(
    db: Parameters<typeof asDb>[0],
    f: Parameters<typeof chargedBooking>[1],
  ) {
    const { booking, payment } = await chargedBooking(db, f);
    await db
      .update(bookingPayments)
      .set({ status: "paid", settledAt: NOW })
      .where(eq(bookingPayments.id, payment.id));
    await db
      .update(bookings)
      .set({ status: "confirmed", holdExpiresAt: null, paymentStatus: "paid" })
      .where(eq(bookings.id, booking.id));
    return { booking, payment };
  }

  const payload = (
    paymentId: string,
    amountFils: number,
    refundKey: string,
  ) => ({
    paymentId,
    amountFils,
    reason: "manager" as const,
    refundKey,
  });

  it("records a partial then a full refund and queues the notification", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await paidCharge(db, f);
      jobs.clear();
      const total = payment.amountFils;

      await handle(
        asDb(db),
        payload(payment.id, 4_000, "k1"),
        undefined,
        minutes(1),
      );
      expect(provider.fake.refundCalls).toEqual([
        {
          reference: payment.providerReference,
          amountFils: 4_000,
          idempotencyKey: "k1",
        },
      ]);
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({
        status: "partially_refunded",
        refundedFils: 4_000,
        refundReference: "rfd_fake",
        refundedAt: minutes(1),
        refundFailureReason: null,
      });
      await expectLedgerConsistent(db, booking.id);

      await handle(
        asDb(db),
        payload(payment.id, total - 4_000, "k2"),
        undefined,
        minutes(2),
      );
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({ status: "refunded", refundedFils: total });
      expect((await db.query.bookings.findFirst())?.paymentStatus).toBe(
        "refunded",
      );
      expect(jobNames(jobs)).toEqual([
        "notification.booking",
        "notification.booking",
      ]);
      expect(jobs.added[0]).toMatchObject({
        payload: {
          type: "booking_refund_recorded",
          bookingId: booking.id,
          amountFils: 4_000,
        },
      });
    });
  });

  it("sets refundFailureReason without retrying on a permanent failure", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await paidCharge(db, f);
      provider.fake.refundResult = {
        failed: "Charge already refunded",
        retryable: false,
      };
      jobs.clear();
      await expect(
        handle(asDb(db), payload(payment.id, 1_000, "k1"), undefined, NOW),
      ).resolves.toBeUndefined();
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({
        status: "paid",
        refundedFils: 0,
        refundFailureReason: "Charge already refunded",
      });
      expect(jobs.added).toEqual([]);
    });
  });

  it("throws on a retryable failure and leaves the ledger untouched", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await paidCharge(db, f);
      const before = await db.query.bookingPayments.findFirst({
        where: eq(bookingPayments.id, payment.id),
      });
      provider.fake.refundResult = {
        failed: "Gateway timeout",
        retryable: true,
      };
      await expect(
        handle(asDb(db), payload(payment.id, 1_000, "k1"), undefined, NOW),
      ).rejects.toThrow("Gateway timeout");
      provider.fake.refundResult = new Error("socket hang up");
      await expect(
        handle(asDb(db), payload(payment.id, 1_000, "k1"), undefined, NOW),
      ).rejects.toThrow("socket hang up");
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toEqual(before);
      expect(
        jobs.added.filter((job) => job.name === "notification.booking"),
      ).toEqual([]);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("records the failure for the manager when the last attempt is exhausted", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await paidCharge(db, f);
      provider.fake.refundResult = {
        failed: "Gateway timeout",
        retryable: true,
      };
      await expect(
        handle(
          asDb(db),
          payload(payment.id, 1_000, "k1"),
          { job: { attempts: 8, max_attempts: 8 } } as unknown as JobHelpers,
          NOW,
        ),
      ).rejects.toThrow("Gateway timeout");
      expect(
        (
          await db.query.bookingPayments.findFirst({
            where: eq(bookingPayments.id, payment.id),
          })
        )?.refundFailureReason,
      ).toBe("Gateway timeout");
    });
  });

  it("refuses to refund more than is left", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await paidCharge(db, f);
      await handle(
        asDb(db),
        payload(payment.id, payment.amountFils + 1, "k1"),
        undefined,
        NOW,
      );
      expect(provider.fake.refundCalls).toEqual([]);
      expect(
        (
          await db.query.bookingPayments.findFirst({
            where: eq(bookingPayments.id, payment.id),
          })
        )?.refundFailureReason,
      ).toBe("Nothing left to refund");
    });
  });
});
