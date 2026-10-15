import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings, venues } from "@repo/db";

import { cancelBooking } from "#src/bookings/cancel";
import {
  NOW,
  VENUE_PHONE,
  at,
  chargedBooking,
  expectLedgerConsistent,
  insertBooking,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { cancelMyBooking } from "#src/routers/bookings/cancel";

const policy = {
  tiers: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 12, refundPercent: 50 },
  ],
  lateRefundPercent: 0,
  customerCancelUntilMinutes: 60,
};

describe("bookings.cancel", () => {
  recordJobs();

  it("cancels while the app cut-off allows and records the refund per the snapshot", async () => {
    await withBookableVenue(async (db, f) => {
      const paid = await insertBooking(db, f, {
        startsAt: at(9, 18),
        endsAt: at(9, 19),
        priceFils: 12_000,
        paymentStatus: "paid",
        cancellationPolicy: policy,
      });
      const result = await cancelMyBooking(db, {
        bookingId: paid.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "cancelled",
        cancelledBy: "customer",
        refundDueFils: 12_000,
        cancellationChargeFils: 0,
        cancelledAt: NOW,
      });
      const row = await db.query.bookings.findFirst({
        where: eq(bookings.id, paid.id),
      });
      expect(row).toMatchObject({
        cancelledByUserId: f.customer,
        holdExpiresAt: null,
      });

      const half = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(6, 6 + 12),
        endsAt: at(6, 20),
        priceFils: 10_000,
        paymentStatus: "paid",
        cancellationPolicy: policy,
      });
      const halved = await cancelMyBooking(db, {
        bookingId: half.id,
        userId: f.customer,
        now: NOW,
      });
      expect(halved).toMatchObject({
        refundDueFils: 5_000,
        cancellationChargeFils: 5_000,
      });
    });
  });

  it("owes nothing back on an unpaid Booking but still records the informational charge", async () => {
    await withBookableVenue(async (db, f) => {
      const unpaid = await insertBooking(db, f, {
        startsAt: at(6, 20),
        endsAt: at(6, 21),
        priceFils: 10_000,
        cancellationPolicy: policy,
      });
      const result = await cancelMyBooking(db, {
        bookingId: unpaid.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({
        refundDueFils: 0,
        cancellationChargeFils: 5_000,
      });
    });
  });

  it("is refused after the cut-off with the Venue phone, and not changed", async () => {
    await withBookableVenue(async (db, f) => {
      const soon = await insertBooking(db, f, {
        startsAt: new Date(NOW.getTime() + 30 * 60_000),
        endsAt: new Date(NOW.getTime() + 90 * 60_000),
        cancellationPolicy: policy,
      });
      await expect(
        cancelMyBooking(db, {
          bookingId: soon.id,
          userId: f.customer,
          now: NOW,
        }),
      ).rejects.toThrow(VENUE_PHONE);
      const row = await db.query.bookings.findFirst({
        where: eq(bookings.id, soon.id),
      });
      expect(row?.status).toBe("confirmed");

      await db
        .update(venues)
        .set({ phone: null })
        .where(eq(venues.id, f.venueId));
      await expect(
        cancelMyBooking(db, {
          bookingId: soon.id,
          userId: f.customer,
          now: NOW,
        }),
      ).rejects.toThrow("Contact the Venue");
    });
  });

  it("is refused for a non-holder, an unknown Booking and a Booking that is not active", async () => {
    await withBookableVenue(async (db, f) => {
      const mine = await insertBooking(db, f, {
        startsAt: at(9, 18),
        endsAt: at(9, 19),
      });
      await expect(
        cancelMyBooking(db, { bookingId: mine.id, userId: f.other, now: NOW }),
      ).rejects.toThrow("Only the holder");
      await expect(
        cancelMyBooking(db, {
          bookingId: "00000000-0000-4000-8000-000000000000",
          userId: f.customer,
          now: NOW,
        }),
      ).rejects.toThrow("Booking not found");

      await cancelMyBooking(db, {
        bookingId: mine.id,
        userId: f.customer,
        now: NOW,
      });
      await expect(
        cancelMyBooking(db, {
          bookingId: mine.id,
          userId: f.customer,
          now: NOW,
        }),
      ).rejects.toThrow("can no longer be cancelled");

      const lapsed = await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() - 1000),
        startsAt: at(9, 20),
        endsAt: at(9, 21),
      });
      await expect(
        cancelMyBooking(db, {
          bookingId: lapsed.id,
          userId: f.customer,
          now: NOW,
        }),
      ).rejects.toThrow("can no longer be cancelled");
    });
  });

  it("cancels a live pending_payment hold with nothing due", async () => {
    await withBookableVenue(async (db, f) => {
      const held = await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() + 60_000),
        startsAt: at(9, 20),
        endsAt: at(9, 21),
      });
      const result = await cancelMyBooking(db, {
        bookingId: held.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "cancelled",
        holdExpiresAt: null,
        refundDueFils: 0,
        cancellationChargeFils: 0,
      });
    });
  });

  it("frees the Slot for another Customer", async () => {
    await withBookableVenue(async (db, f) => {
      const { createBooking } = await import("#src/routers/bookings/create");
      const args = {
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: at(9, 18),
        durationMinutes: 60,
        now: NOW,
      };
      const first = await createBooking(db, { ...args, userId: f.customer });
      await cancelMyBooking(db, {
        bookingId: first.booking.id,
        userId: f.customer,
        now: NOW,
      });
      await expect(
        createBooking(db, { ...args, userId: f.other }),
      ).resolves.toBeDefined();
    });
  });
});

describe("cancelBooking (shared)", () => {
  recordJobs();

  it("refunds a Venue cancel in full whatever the policy says, and refuses a second cancel", async () => {
    await withBookableVenue(async (db, f) => {
      const row = await insertBooking(db, f, {
        startsAt: new Date(NOW.getTime() + 60 * 60_000),
        endsAt: new Date(NOW.getTime() + 120 * 60_000),
        priceFils: 10_000,
        paymentStatus: "paid",
        cancellationPolicy: policy,
      });
      const refund = await cancelBooking(db, {
        booking: row,
        cancelledBy: "venue",
        actorUserId: f.manager,
        reason: "Flooded",
        now: NOW,
      });
      expect(refund).toMatchObject({
        refundDueFils: 10_000,
        cancellationChargeFils: 0,
      });
      const stored = await db.query.bookings.findFirst({
        where: eq(bookings.id, row.id),
      });
      expect(stored).toMatchObject({
        cancelledBy: "venue",
        cancelReason: "Flooded",
        cancelledByUserId: f.manager,
      });
      await expect(
        cancelBooking(db, {
          booking: row,
          cancelledBy: "venue",
          actorUserId: f.manager,
          now: NOW,
        }),
      ).rejects.toThrow("already changed");
    });
  });
});

describe("cancel and the Payment ledger", () => {
  const jobs = recordJobs();
  useFakeProvider();

  async function confirmedTapBooking(
    db: Parameters<typeof chargedBooking>[0],
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
    jobs.clear();
    return { booking, payment };
  }

  it("queues a provider refund for the policy amount on a Customer cancel and removes the hold job", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await confirmedTapBooking(db, f);
      await db
        .update(bookings)
        .set({
          startsAt: at(6, 20),
          endsAt: at(6, 21),
          cancellationPolicy: policy,
        })
        .where(eq(bookings.id, booking.id));

      const result = await cancelMyBooking(db, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result.refundDueFils).toBe(booking.priceFils / 2);
      expect(jobs.removed).toEqual([`booking:expire:${booking.id}`]);
      expect(jobNames(jobs)).toEqual(["payment.refund"]);
      expect(jobs.added[0]?.payload).toEqual({
        paymentId: payment.id,
        amountFils: booking.priceFils / 2,
        reason: "customer_cancel",
        requestedByUserId: f.customer,
        refundKey: `cancel:${booking.id}`,
      });
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("refunds the full amount on a Venue cancel whatever the policy says", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await confirmedTapBooking(db, f);
      await cancelBooking(db, {
        booking: {
          ...booking,
          status: "confirmed",
          cancellationPolicy: policy,
        },
        cancelledBy: "venue",
        actorUserId: f.manager,
        now: NOW,
      });
      expect(jobs.added[0]?.payload).toMatchObject({
        paymentId: payment.id,
        amountFils: booking.priceFils,
        reason: "venue_cancel",
      });
    });
  });

  it("leaves the ledger paid with a refund due for a manual Payment", async () => {
    await withBookableVenue(async (db, f) => {
      const paid = await insertBooking(db, f, {
        startsAt: at(9, 18),
        endsAt: at(9, 19),
        paymentStatus: "paid",
        cancellationPolicy: policy,
      });
      const result = await cancelMyBooking(db, {
        bookingId: paid.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result.refundDueFils).toBe(paid.priceFils);
      expect(jobs.added.filter((job) => job.name === "payment.refund")).toEqual(
        [],
      );
      const [row] = await db.select().from(bookingPayments);
      expect(row).toMatchObject({ status: "paid", refundedFils: 0 });
      await expectLedgerConsistent(db, paid.id);
    });
  });

  it("removes the hold job and takes no refund for a pending_payment Booking", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await chargedBooking(db, f);
      jobs.clear();
      const result = await cancelMyBooking(db, {
        bookingId: booking.id,
        userId: f.customer,
        now: NOW,
      });
      expect(result).toMatchObject({ status: "cancelled", refundDueFils: 0 });
      expect(jobs.removed).toEqual([`booking:expire:${booking.id}`]);
      expect(jobs.added).toEqual([]);
    });
  });
});
