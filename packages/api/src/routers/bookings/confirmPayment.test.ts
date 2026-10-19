import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  chargedBooking,
  createHeldBooking,
  expectLedgerConsistent,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { confirmPayment } from "./confirmPayment";

describe("bookings.confirmPayment", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  it("confirms the Booking and queues booking.confirmed when the charge is paid", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      provider.fake.chargeState = {
        status: "paid",
        providerStatus: "CAPTURED",
        method: "card",
      };
      jobs.clear();
      const result = await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "confirmed",
        paymentStatus: "paid",
        holdExpiresAt: null,
      });
      expect(provider.fake.retrieveCalls).toEqual([payment.providerReference]);
      expect(jobNames(jobs)).toEqual(["booking.confirmed"]);
      await expectLedgerConsistent(db, booking.id);

      jobs.clear();
      await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(jobs.added).toEqual([]);
      expect(provider.fake.retrieveCalls).toHaveLength(1);
    });
  });

  it("marks the Payment failed and keeps the hold when the charge failed", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      provider.fake.chargeState = {
        status: "failed",
        providerStatus: "DECLINED",
        reason: "Declined",
      };
      const result = await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "pending_payment",
        paymentStatus: "failed",
      });
      expect(result.holdExpiresAt).not.toBeNull();
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({
        status: "failed",
        failureReason: "Declined",
        providerStatus: "DECLINED",
      });
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("leaves a still-pending charge for the poll job", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await chargedBooking(db, f);
      provider.fake.chargeState = {
        status: "pending",
        providerStatus: "IN_PROGRESS",
      };
      const result = await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "pending_payment",
        paymentStatus: "pending",
      });
    });
  });

  it("refuses a Booking with no charge yet, and someone else's Booking", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      await expect(
        confirmPayment(db as never, {
          bookingId: booking.id,
          userId: f.customer,
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        confirmPayment(db as never, {
          bookingId: booking.id,
          userId: f.other,
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("queues a refund when the charge is captured after the hold lapsed", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      provider.fake.chargeState = {
        status: "paid",
        providerStatus: "CAPTURED",
      };
      jobs.clear();
      await confirmPayment(db as never, {
        bookingId: booking.id,
        userId: f.customer,
        now: new Date(NOW.getTime() + 11 * 60_000),
      });
      expect(
        (
          await db.query.bookings.findFirst({
            where: eq(bookings.id, booking.id),
          })
        )?.status,
      ).toBe("expired");
      expect(jobs.added.map((job) => [job.name, job.payload])).toEqual([
        [
          "payment.refund",
          {
            paymentId: payment.id,
            amountFils: payment.amountFils,
            reason: "expired_after_capture",
            refundKey: `expired-after-capture:${payment.id}`,
          },
        ],
      ]);
    });
  });
});
