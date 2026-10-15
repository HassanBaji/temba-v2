import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  chargedBooking,
  expectLedgerConsistent,
  insertBooking,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { recordBookingRefund } from "./recordRefund";

const manager = (userId: string) => ({ userId, publicMetadata: undefined });

describe("bookings.recordRefund", () => {
  const jobs = recordJobs();
  useFakeProvider();

  it("records a manual refund at once and notifies the Customer", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        paymentStatus: "paid",
        priceFils: 12_000,
      });
      const partial = await recordBookingRefund(db, {
        bookingId: booking.id,
        amountFils: 5_000,
        reference: "cash back",
        actor: manager(f.manager),
        now: NOW,
      });
      expect(partial.refundInProgress).toBe(false);
      expect(partial.paymentStatus).toBe("partially_refunded");
      expect(partial.payments[0]).toMatchObject({
        refundedFils: 5_000,
        refundReference: "cash back",
        refundedByUserId: f.manager,
        refundedAt: NOW,
      });
      expect(jobNames(jobs)).toEqual(["notification.booking"]);

      await expect(
        recordBookingRefund(db, {
          bookingId: booking.id,
          amountFils: 7_001,
          actor: manager(f.manager),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });

      const full = await recordBookingRefund(db, {
        bookingId: booking.id,
        amountFils: 7_000,
        actor: manager(f.manager),
        now: NOW,
      });
      expect(full.paymentStatus).toBe("refunded");
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("refuses when nothing was paid, and for a non-manager", async () => {
    await withBookableVenue(async (db, f) => {
      const unpaid = await insertBooking(db, f);
      await expect(
        recordBookingRefund(db, {
          bookingId: unpaid.id,
          amountFils: 1,
          actor: manager(f.manager),
          now: NOW,
        }),
      ).rejects.toThrow("Nothing has been paid");
      await expect(
        recordBookingRefund(db, {
          bookingId: unpaid.id,
          amountFils: 1,
          actor: manager(f.other),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("enqueues a payment.refund job for a Tap Payment and reports it in progress", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      await db
        .update(bookingPayments)
        .set({ status: "paid" })
        .where(eq(bookingPayments.id, payment.id));
      await db
        .update(bookings)
        .set({
          status: "confirmed",
          holdExpiresAt: null,
          paymentStatus: "paid",
        })
        .where(eq(bookings.id, booking.id));
      jobs.clear();

      const result = await recordBookingRefund(db, {
        bookingId: booking.id,
        amountFils: 3_000,
        actor: manager(f.manager),
        now: NOW,
      });
      expect(result.refundInProgress).toBe(true);
      expect(result.payments[0]).toMatchObject({
        refundedFils: 0,
        status: "paid",
      });
      expect(jobNames(jobs)).toEqual(["payment.refund"]);
      expect(jobs.added[0]?.payload).toMatchObject({
        paymentId: payment.id,
        amountFils: 3_000,
        reason: "manager",
        requestedByUserId: f.manager,
      });
    });
  });
});
