import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import { refundPercentAt } from "@repo/domain/booking-refund";

import {
  NOW,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { bookingById } from "#src/routers/bookings/byId";
import { setCourtSport } from "#src/routers/venues/setCourtSport";

const policy = {
  tiers: [
    { hoursBefore: 48, refundPercent: 100 },
    { hoursBefore: 12, refundPercent: 50 },
  ],
  lateRefundPercent: 0,
  customerCancelUntilMinutes: 60,
};

describe("bookings.byId", () => {
  it("carries the Court sport and survives a sport change untouched", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
        priceFils: 10_000,
        paymentStatus: "paid",
        cancellationPolicy: policy,
      });
      const holder = { userId: f.customer, publicMetadata: undefined };
      const before = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });

      const padel = await bookingById(db, {
        bookingId: booking.id,
        actor: holder,
        now: NOW,
      });
      expect(padel.court.sport).toBe("padel");

      await setCourtSport(db, {
        courtId: booking.courtId,
        sport: "football",
        actor: { userId: "operator", publicMetadata: { operator: true } },
      });

      const football = await bookingById(db, {
        bookingId: booking.id,
        actor: holder,
        now: NOW,
      });
      expect(football.court.sport).toBe("football");
      const after = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });
      expect(after).toEqual(before);
    });
  });

  it("reports the live cancel consequence consistent with booking-refund", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
        priceFils: 10_000,
        paymentStatus: "paid",
        cancellationPolicy: policy,
      });
      const holder = { userId: f.customer, publicMetadata: undefined };

      const early = await bookingById(db, {
        bookingId: booking.id,
        actor: holder,
        now: NOW,
      });
      expect(early.cancel).toMatchObject({
        allowed: true,
        until: at(8, 17),
        refundPercentNow: 100,
        refundDueFilsNow: 10_000,
      });
      expect(early.cancel.nextStep).toMatchObject({
        currentPercent: 100,
        nextPercent: 50,
        deadline: at(6, 18),
      });
      expect(early.cancel.nextStep?.text).toBe(
        "Full refund until Sun 18:00, then 50% refund",
      );

      const later = new Date(at(8, 18).getTime() - 20 * 3_600_000);
      const mid = await bookingById(db, {
        bookingId: booking.id,
        actor: holder,
        now: later,
      });
      expect(mid.cancel.refundPercentNow).toBe(
        refundPercentAt(policy, booking.startsAt, later),
      );
      expect(mid.cancel).toMatchObject({
        refundPercentNow: 50,
        refundDueFilsNow: 5_000,
        allowed: true,
      });

      const lastMinutes = new Date(at(8, 18).getTime() - 30 * 60_000);
      const closed = await bookingById(db, {
        bookingId: booking.id,
        actor: holder,
        now: lastMinutes,
      });
      expect(closed.cancel).toMatchObject({
        allowed: false,
        refundPercentNow: 0,
        refundDueFilsNow: 0,
        nextStep: null,
      });
    });
  });

  it("is visible to the holder, a manager of the Venue and an Operator, and refused to others", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
      });
      const read = (userId: string, publicMetadata?: Record<string, unknown>) =>
        bookingById(db, {
          bookingId: booking.id,
          actor: { userId, publicMetadata },
          now: NOW,
        });

      const asHolder = await read(f.customer);
      expect(asHolder).toMatchObject({
        id: booking.id,
        canCreateGame: true,
        venue: { name: "Padel Central" },
        court: { name: "Court 1" },
        status: "confirmed",
        statusLabel: "Confirmed",
      });
      expect(asHolder.cancellationPolicyLines[0]).toContain("Full refund");

      const asManager = await read(f.manager);
      expect(asManager.cancel.allowed).toBe(false);
      expect(asManager.canCreateGame).toBe(false);
      await expect(read(f.other, { operator: true })).resolves.toBeDefined();
      await expect(read(f.other)).rejects.toThrow("can't view this Booking");
      await expect(
        bookingById(db, {
          bookingId: "00000000-0000-4000-8000-000000000000",
          actor: { userId: f.customer, publicMetadata: undefined },
        }),
      ).rejects.toThrow("Booking not found");
    });
  });

  it("does not offer Game creation for cancelled or past Bookings", async () => {
    await withBookableVenue(async (db, f) => {
      const cancelled = await insertBooking(db, f, { status: "cancelled" });
      const past = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(1, 18),
        endsAt: at(1, 19),
      });
      const holder = { userId: f.customer, publicMetadata: undefined };
      for (const { id } of [cancelled, past]) {
        const view = await bookingById(db, {
          bookingId: id,
          actor: holder,
          now: NOW,
        });
        expect(view.canCreateGame).toBe(false);
        expect(view.cancel.allowed).toBe(false);
      }
    });
  });

  it("gives a manager the holder, the ledger and the refundable maximum, and a holder none of it", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, { paymentStatus: "paid" });
      await db
        .update(bookingPayments)
        .set({ refundedFils: 2_500, status: "partially_refunded" })
        .where(eq(bookingPayments.bookingId, booking.id));

      const asManager = await bookingById(db, {
        bookingId: booking.id,
        actor: { userId: f.manager, publicMetadata: undefined },
        now: NOW,
      });
      expect(asManager.manager?.holder).toMatchObject({
        kind: "user",
        name: "Customer",
      });
      expect(asManager.manager?.payments).toHaveLength(1);
      expect(asManager.manager?.refundableFils).toBe(7_500);

      const asHolder = await bookingById(db, {
        bookingId: booking.id,
        actor: { userId: f.customer, publicMetadata: undefined },
        now: NOW,
      });
      expect(asHolder.manager).toBeNull();
    });
  });
});
