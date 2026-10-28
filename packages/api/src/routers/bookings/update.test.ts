import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { games, venues } from "@repo/db";
import type { TestDatabase } from "@repo/db/testing";

import {
  NOW,
  at,
  expectLedgerConsistent,
  insertBooking,
  recordJobs,
  withBookableVenue,
  type BookableFixture,
} from "#src/bookings/booking.test-support";

import { createBookingForVenue } from "./createForVenue";
import { updateBookingForVenue } from "./update";

describe("bookings.update", () => {
  recordJobs();

  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  /** A manager-made Booking, 18:00 to 19:00 on the 7th, with a pending manual Payment. */
  const unpaidBooking = (db: TestDatabase, f: BookableFixture) =>
    createBookingForVenue(db, {
      venueId: f.venueId,
      courtId: f.court1,
      startsAt: at(7, 18),
      durationMinutes: 60,
      holder: { userId: f.customer },
      actor: asManager(f.manager),
      now: NOW,
    });

  const edit = (
    db: TestDatabase,
    f: BookableFixture,
    bookingId: string,
    patch: Partial<Parameters<typeof updateBookingForVenue>[1]>,
  ) =>
    updateBookingForVenue(db, {
      bookingId,
      actor: asManager(f.manager),
      now: NOW,
      ...patch,
    });

  it("moves to another Court and time, repricing from the rules and the pending Payment with it", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await unpaidBooking(db, f);
      const result = await edit(db, f, booking.id, {
        courtId: f.court2,
        startsAt: at(8, 20),
        durationMinutes: 90,
      });
      expect(result).toMatchObject({
        courtId: f.court2,
        startsAt: at(8, 20),
        endsAt: at(8, 21, 30),
        priceFils: 15_000,
        cancellationPolicy: booking.cancellationPolicy,
      });
      expect(result.payments[0]?.amountFils).toBe(15_000);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("extends in place without clashing with itself", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await unpaidBooking(db, f);
      const result = await edit(db, f, booking.id, { durationMinutes: 120 });
      expect(result).toMatchObject({ endsAt: at(7, 20), priceFils: 20_000 });
    });
  });

  it("keeps a typed price over the rules and edits notes", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await unpaidBooking(db, f);
      await edit(db, f, booking.id, {
        startsAt: at(7, 19),
        priceFils: 7_500,
        managerNotes: " Regular, 10% off ",
      });
      let row = await db.query.bookings.findFirst();
      expect(row).toMatchObject({
        startsAt: at(7, 19),
        priceFils: 7_500,
        managerNotes: "Regular, 10% off",
      });
      await edit(db, f, booking.id, { managerNotes: null });
      row = await db.query.bookings.findFirst();
      expect(row?.managerNotes).toBeNull();
    });
  });

  it("refuses a move onto a taken interval", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await unpaidBooking(db, f);
      await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      await expect(
        edit(db, f, booking.id, { courtId: f.court2 }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
    });
  });

  it("refuses moving a Booking with a live Game", async () => {
    await withBookableVenue(async (db, f) => {
      const [game] = await db
        .insert(games)
        .values({ venueId: f.venueId, createdBy: f.customer, rated: false })
        .returning({ id: games.id });
      const booking = await insertBooking(db, f, { gameId: game!.id });
      await expect(
        edit(db, f, booking.id, { startsAt: at(7, 20) }),
      ).rejects.toThrow("Cancel the Game first");
      await edit(db, f, booking.id, { managerNotes: "Group of four" });
    });
  });

  it("refuses a price change on a paid Booking but moves it at the same price", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, { paymentStatus: "paid" });
      await expect(
        edit(db, f, booking.id, { priceFils: 5_000 }),
      ).rejects.toThrow("The payment is settled, so the price cannot change");
      await expect(
        edit(db, f, booking.id, { durationMinutes: 90 }),
      ).rejects.toThrow("the price stays 10.000 BD");
      const result = await edit(db, f, booking.id, {
        startsAt: at(7, 20),
        priceFils: 10_000,
      });
      expect(result.startsAt).toEqual(at(7, 20));
    });
  });

  it("refuses a Soft-archived Venue, an ended Booking and a cancelled one", async () => {
    await withBookableVenue(async (db, f) => {
      const ended = await insertBooking(db, f, {
        startsAt: at(5, 9),
        endsAt: at(5, 10),
      });
      await expect(
        edit(db, f, ended.id, { managerNotes: "x" }),
      ).rejects.toThrow("Only a confirmed Booking that has not ended");
      const cancelled = await insertBooking(db, f, { status: "cancelled" });
      await expect(
        edit(db, f, cancelled.id, { managerNotes: "x" }),
      ).rejects.toThrow("Only a confirmed Booking that has not ended");

      const booking = await unpaidBooking(db, f);
      await db
        .update(venues)
        .set({ archivedAt: NOW })
        .where(eq(venues.id, f.venueId));
      await expect(
        edit(db, f, booking.id, { managerNotes: "x" }),
      ).rejects.toThrow("This Venue is archived");
    });
  });
});
