import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, venuePricingRules, venues } from "@repo/db";

import {
  NOW,
  at,
  expectLedgerConsistent,
  insertBooking,
  jobNames,
  recordJobs,
  withBookableVenue,
  type BookableFixture,
} from "#src/bookings/booking.test-support";

import { createBookingForVenue, type BookingHolder } from "./createForVenue";

describe("bookings.createForVenue", () => {
  const jobs = recordJobs();

  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  const book = (
    db: Parameters<typeof createBookingForVenue>[0],
    f: BookableFixture,
    patch: Partial<Parameters<typeof createBookingForVenue>[1]> = {},
  ) =>
    createBookingForVenue(db, {
      venueId: f.venueId,
      courtId: f.court1,
      startsAt: at(7, 18),
      durationMinutes: 90,
      holder: { guestName: "Hassan", guestPhone: "+973 3612 4408" },
      actor: asManager(f.manager),
      now: NOW,
      ...patch,
    });

  it("confirms a Guest Booking at once with a pending manual Payment", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await book(db, f, { managerNotes: "Pays at the desk" });
      expect(booking).toMatchObject({
        status: "confirmed",
        source: "venue",
        paymentStatus: "pending",
        priceFils: 15_000,
        holdExpiresAt: null,
        startsAt: at(7, 18),
        endsAt: at(7, 19, 30),
      });
      expect(booking.payments).toHaveLength(1);
      expect(booking.payments[0]).toMatchObject({
        provider: "manual",
        status: "pending",
        amountFils: 15_000,
      });
      const row = await db.query.bookings.findFirst();
      expect(row).toMatchObject({
        userId: null,
        guestName: "Hassan",
        guestPhone: "+973 3612 4408",
        managerNotes: "Pays at the desk",
        createdByUserId: f.manager,
      });
      expect(jobNames(jobs)).toEqual(["booking.confirmed"]);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("books for a Temba User", async () => {
    await withBookableVenue(async (db, f) => {
      const holder: BookingHolder = { userId: f.customer };
      await book(db, f, { holder });
      const row = await db.query.bookings.findFirst();
      expect(row).toMatchObject({
        userId: f.customer,
        guestName: null,
        guestPhone: null,
      });
    });
  });

  it("refuses a User that does not exist", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        book(db, f, {
          holder: { userId: "00000000-0000-4000-8000-000000000000" },
        }),
      ).rejects.toMatchObject({ code: "NOT_FOUND" });
    });
  });

  it("settles the Payment when the manager took it at the desk", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await book(db, f, {
        payment: { status: "paid", method: "cash", reference: "receipt 7" },
      });
      expect(booking.paymentStatus).toBe("paid");
      expect(booking.payments[0]).toMatchObject({
        status: "paid",
        method: "cash",
        providerReference: "receipt 7",
        settledByUserId: f.manager,
        settledAt: NOW,
      });
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("waives the Payment", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await book(db, f, { payment: { status: "waived" } });
      expect(booking.paymentStatus).toBe("waived");
    });
  });

  it("needs a method to record a paid Booking and leaves nothing behind", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        book(db, f, { payment: { status: "paid" } }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await db.query.bookings.findMany()).toHaveLength(0);
      expect(await db.select().from(bookingPayments)).toHaveLength(0);
    });
  });

  it("stores a typed price over the rules", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await book(db, f, { priceFils: 8_000 });
      expect(booking.priceFils).toBe(8_000);
      expect(booking.payments[0]?.amountFils).toBe(8_000);
    });
  });

  it("books unpriced time only with a typed price", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .delete(venuePricingRules)
        .where(eq(venuePricingRules.venueId, f.venueId));
      await expect(book(db, f)).rejects.toThrow("Type a price");
      const booking = await book(db, f, { priceFils: 12_000 });
      expect(booking.priceFils).toBe(12_000);
    });
  });

  it("ignores the lead, the horizon and the Venue's duration options", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(venues)
        .set({ minLeadMinutes: 240, bookingHorizonDays: 1 })
        .where(eq(venues.id, f.venueId));
      await book(db, f, { startsAt: at(5, 13), durationMinutes: 150 });
      await book(db, f, { startsAt: at(28, 10) });
      expect(await db.query.bookings.findMany()).toHaveLength(2);
    });
  });

  it("books a slot already under way but refuses one that has ended", async () => {
    await withBookableVenue(async (db, f) => {
      await book(db, f, { startsAt: at(5, 11, 30), durationMinutes: 60 });
      await expect(
        book(db, f, { startsAt: at(5, 10), durationMinutes: 60 }),
      ).rejects.toThrow("That time has already passed");
    });
  });

  it("refuses overlapping an occupying Booking with CONFLICT", async () => {
    await withBookableVenue(async (db, f) => {
      await insertBooking(db, f);
      await expect(
        book(db, f, { startsAt: at(7, 18, 30) }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await book(db, f, { courtId: f.court2 });
    });
  });

  it("books while the Venue is not accepting Customer bookings", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(venues)
        .set({ acceptingBookings: false })
        .where(eq(venues.id, f.venueId));
      await book(db, f);
      expect(await db.query.bookings.findMany()).toHaveLength(1);
    });
  });

  it("refuses an archived Venue, a Court from another Venue and outside hours", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(book(db, f, { courtId: f.elsewhereCourt })).rejects.toThrow(
        "That Court does not belong to this Venue",
      );
      await expect(book(db, f, { startsAt: at(7, 6) })).rejects.toThrow(
        "The Venue is not open at that time",
      );
      await db
        .update(venues)
        .set({ archivedAt: NOW })
        .where(eq(venues.id, f.venueId));
      await expect(book(db, f)).rejects.toThrow("This Venue is archived");
    });
  });

  it("is for the Venue's managers only", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        book(db, f, { actor: asManager(f.customer) }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
      await book(db, f, {
        actor: { userId: f.other, publicMetadata: { operator: true } },
      });
    });
  });
});
