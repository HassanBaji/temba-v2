import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  createHeldBooking,
  expectLedgerConsistent,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { createBooking } from "#src/routers/bookings/create";

import { handle } from "./booking.expire-hold";

const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe("booking.expire-hold", () => {
  const jobs = recordJobs();
  useFakeProvider();

  it("expires a lapsed pending_payment Booking and frees the Slot", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      jobs.clear();
      await handle(asDb(db), { bookingId: booking.id }, undefined, minutes(10));

      expect(
        await db.query.bookings.findFirst({
          where: eq(bookings.id, booking.id),
        }),
      ).toMatchObject({ status: "expired", holdExpiresAt: null });
      expect(jobs.added).toEqual([]);
      await createBooking(asDb(db), {
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: booking.startsAt,
        durationMinutes: 60,
        userId: f.other,
        now: minutes(10),
      });
    });
  });

  it("leaves a hold that is still running, and a confirmed Booking, alone", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      await handle(asDb(db), { bookingId: booking.id }, undefined, minutes(5));
      expect((await db.query.bookings.findFirst())?.status).toBe(
        "pending_payment",
      );

      await db
        .update(bookings)
        .set({ status: "confirmed", holdExpiresAt: null })
        .where(eq(bookings.id, booking.id));
      await handle(asDb(db), { bookingId: booking.id }, undefined, minutes(30));
      expect((await db.query.bookings.findFirst())?.status).toBe("confirmed");
    });
  });

  it("queues a full refund when a charge was captured on an expired Booking", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      await db
        .update(bookings)
        .set({ status: "expired", holdExpiresAt: null })
        .where(eq(bookings.id, booking.id));
      await db
        .update(bookingPayments)
        .set({ status: "paid" })
        .where(eq(bookingPayments.id, payment.id));
      jobs.clear();

      await handle(asDb(db), { bookingId: booking.id }, undefined, minutes(12));

      expect(jobNames(jobs)).toEqual(["payment.refund"]);
      expect(jobs.added[0]?.payload).toMatchObject({
        paymentId: payment.id,
        amountFils: booking.priceFils,
        reason: "expired_after_capture",
        refundKey: `expired-after-capture:${payment.id}`,
      });
    });
  });
});
