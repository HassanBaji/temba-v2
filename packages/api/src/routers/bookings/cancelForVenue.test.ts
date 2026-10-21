import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings, games, venues } from "@repo/db";

import {
  NOW,
  at,
  createHeldBooking,
  expectLedgerConsistent,
  insertBooking,
  insertPayment,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
  type BookableFixture,
} from "#src/bookings/booking.test-support";
import type { TestDatabase } from "@repo/db/testing";

import { cancelBookingForVenue } from "./cancelForVenue";

const policy = {
  tiers: [{ hoursBefore: 48, refundPercent: 100 }],
  lateRefundPercent: 50,
  customerCancelUntilMinutes: 24 * 60,
};

describe("bookings.cancelForVenue", () => {
  const jobs = recordJobs();
  useFakeProvider();

  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  async function tapPaidBooking(db: TestDatabase, f: BookableFixture) {
    const booking = await insertBooking(db, f, {
      startsAt: at(5, 14),
      endsAt: at(5, 15),
      cancellationPolicy: policy,
      paymentStatus: "paid",
    });
    await db.delete(bookingPayments);
    const payment = await insertPayment(db, booking.id, {
      provider: "tap",
      status: "paid",
      amountFils: booking.priceFils,
      settledAt: NOW,
    });
    return { booking, payment };
  }

  it("cancels after the Customer's cut-off, refunds in full and queues the online refund", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await tapPaidBooking(db, f);
      const result = await cancelBookingForVenue(db, {
        bookingId: booking.id,
        cancelledBy: "venue",
        reason: "Floodlight fault on Court 1",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "cancelled",
        refundDueFils: booking.priceFils,
      });
      const row = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });
      expect(row).toMatchObject({
        cancelledBy: "venue",
        cancelledByUserId: f.manager,
        cancelReason: "Floodlight fault on Court 1",
        cancelledAt: NOW,
      });
      expect(jobNames(jobs)).toEqual(["payment.refund"]);
      expect(jobs.added[0]?.payload).toMatchObject({
        paymentId: payment.id,
        amountFils: booking.priceFils,
        reason: "venue_cancel",
      });
    });
  });

  it("applies the Customer's policy when the Customer asked", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await tapPaidBooking(db, f);
      const result = await cancelBookingForVenue(db, {
        bookingId: booking.id,
        cancelledBy: "customer",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.refundDueFils).toBe(booking.priceFils / 2);
      expect(jobs.added[0]?.payload).toMatchObject({
        amountFils: booking.priceFils / 2,
        reason: "customer_cancel",
      });
    });
  });

  it("leaves a manual Payment for the manager with the refund due", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, { paymentStatus: "paid" });
      const result = await cancelBookingForVenue(db, {
        bookingId: booking.id,
        cancelledBy: "venue",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.refundDueFils).toBe(booking.priceFils);
      expect(jobNames(jobs)).toEqual([]);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("cancels a Booking pending payment with nothing due", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      const result = await cancelBookingForVenue(db, {
        bookingId: booking.id,
        cancelledBy: "venue",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result).toMatchObject({ status: "cancelled", refundDueFils: 0 });
    });
  });

  it("cancels the live Game on the Booking", async () => {
    await withBookableVenue(async (db, f) => {
      const [game] = await db
        .insert(games)
        .values({ venueId: f.venueId, createdBy: f.customer, rated: false })
        .returning({ id: games.id });
      const booking = await insertBooking(db, f, { gameId: game!.id });
      await cancelBookingForVenue(db, {
        bookingId: booking.id,
        cancelledBy: "venue",
        actor: asManager(f.manager),
        now: NOW,
      });
      const row = await db.query.games.findFirst({
        where: eq(games.id, game!.id),
      });
      expect(row?.cancelledAt).not.toBeNull();
    });
  });

  it("works on a Soft-archived Venue", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f);
      await db
        .update(venues)
        .set({ archivedAt: NOW })
        .where(eq(venues.id, f.venueId));
      const result = await cancelBookingForVenue(db, {
        bookingId: booking.id,
        cancelledBy: "venue",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.status).toBe("cancelled");
    });
  });

  it("is refused after the end, on a finished Booking and for non-managers", async () => {
    await withBookableVenue(async (db, f) => {
      const ended = await insertBooking(db, f, {
        startsAt: at(5, 10),
        endsAt: at(5, 11),
      });
      await expect(
        cancelBookingForVenue(db, {
          bookingId: ended.id,
          cancelledBy: "venue",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toThrow("This Booking has ended. Mark it no-show instead");

      const cancelled = await insertBooking(db, f, { status: "cancelled" });
      await expect(
        cancelBookingForVenue(db, {
          bookingId: cancelled.id,
          cancelledBy: "venue",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toThrow("This Booking can no longer be cancelled");

      const upcoming = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
      });
      await expect(
        cancelBookingForVenue(db, {
          bookingId: upcoming.id,
          cancelledBy: "venue",
          actor: asManager(f.customer),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
