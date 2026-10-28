import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, venues } from "@repo/db";

import {
  NOW,
  at,
  insertBooking,
  recordJobs,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { markBookingNoShow } from "./markNoShow";

describe("bookings.markNoShow", () => {
  recordJobs();

  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  it("marks a started confirmed Booking and leaves the ledger alone", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        startsAt: at(5, 11, 30),
        endsAt: at(5, 12, 30),
        paymentStatus: "paid",
      });
      const before = await db.select().from(bookingPayments);
      const result = await markBookingNoShow(db, {
        bookingId: booking.id,
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result).toMatchObject({
        status: "no_show",
        paymentStatus: "paid",
      });
      const row = await db.query.bookings.findFirst();
      expect(row?.noShowAt).toEqual(NOW);
      expect(await db.select().from(bookingPayments)).toEqual(before);
    });
  });

  it("works after the end and on a Soft-archived Venue", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        startsAt: at(5, 9),
        endsAt: at(5, 10),
      });
      await db
        .update(venues)
        .set({ archivedAt: NOW })
        .where(eq(venues.id, f.venueId));
      const result = await markBookingNoShow(db, {
        bookingId: booking.id,
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.status).toBe("no_show");
    });
  });

  it("is refused before the start, from any other status and for non-managers", async () => {
    await withBookableVenue(async (db, f) => {
      const upcoming = await insertBooking(db, f);
      await expect(
        markBookingNoShow(db, {
          bookingId: upcoming.id,
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toThrow("A Booking can be marked no-show once it has started");

      const cancelled = await insertBooking(db, f, {
        startsAt: at(5, 9),
        endsAt: at(5, 10),
        status: "cancelled",
      });
      await expect(
        markBookingNoShow(db, {
          bookingId: cancelled.id,
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toThrow("Only a confirmed Booking can be marked no-show");

      await expect(
        markBookingNoShow(db, {
          bookingId: cancelled.id,
          actor: asManager(f.other),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
