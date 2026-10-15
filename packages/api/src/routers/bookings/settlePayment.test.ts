import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  chargedBooking,
  expectLedgerConsistent,
  insertBooking,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { settleBookingPayment } from "./settlePayment";

describe("bookings.settlePayment", () => {
  recordJobs();
  useFakeProvider();

  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  it("marks a pending manual Payment paid with a method, who and when", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f);
      const result = await settleBookingPayment(db, {
        bookingId: booking.id,
        outcome: "paid",
        method: "cash",
        reference: "receipt 1042",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.paymentStatus).toBe("paid");
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0]).toMatchObject({
        provider: "manual",
        status: "paid",
        method: "cash",
        providerReference: "receipt 1042",
        settledByUserId: f.manager,
        settledAt: NOW,
        amountFils: booking.priceFils,
      });
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("needs a method to mark paid", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f);
      await expect(
        settleBookingPayment(db, {
          bookingId: booking.id,
          outcome: "paid",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await db.select().from(bookingPayments)).toEqual([]);
    });
  });

  it("waives and fails a pending Payment", async () => {
    await withBookableVenue(async (db, f) => {
      const waived = await insertBooking(db, f);
      const failed = await insertBooking(db, f, { courtId: f.court2 });
      for (const [booking, outcome] of [
        [waived, "waived"],
        [failed, "failed"],
      ] as const) {
        const result = await settleBookingPayment(db, {
          bookingId: booking.id,
          outcome,
          actor: asManager(f.manager),
          now: NOW,
        });
        expect(result.paymentStatus).toBe(outcome);
        await expectLedgerConsistent(db, booking.id);
      }
    });
  });

  it("refuses to settle a paid Payment again, or a Payment taken online", async () => {
    await withBookableVenue(async (db, f) => {
      const paid = await insertBooking(db, f, { paymentStatus: "paid" });
      await expect(
        settleBookingPayment(db, {
          bookingId: paid.id,
          outcome: "waived",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
  });

  it("refuses a Tap Payment, except waiving a failed one", async () => {
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
      await expect(
        settleBookingPayment(db, {
          bookingId: booking.id,
          outcome: "paid",
          method: "cash",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toThrow("cannot be settled by hand");

      await db
        .update(bookingPayments)
        .set({ status: "failed" })
        .where(eq(bookingPayments.id, payment.id));
      await expect(
        settleBookingPayment(db, {
          bookingId: booking.id,
          outcome: "paid",
          method: "cash",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      const waived = await settleBookingPayment(db, {
        bookingId: booking.id,
        outcome: "waived",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(waived.paymentStatus).toBe("waived");
    });
  });

  it("refuses a caller who does not manage the Venue", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f);
      await expect(
        settleBookingPayment(db, {
          bookingId: booking.id,
          outcome: "waived",
          actor: asManager(f.other),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
