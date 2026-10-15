import { describe, expect, it } from "vitest";

import { courts } from "@repo/db";
import { eq } from "drizzle-orm";

import {
  NOW,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { addClosure } from "#src/routers/venues/addClosure";
import { deleteCourt } from "#src/routers/venues/deleteCourt";

describe("addClosure conflicts", () => {
  it("returns the occupying Bookings inside the block and never cancels them", async () => {
    await withBookableVenue(async (db, f) => {
      const manager = { userId: f.manager, publicMetadata: undefined };
      const inside = await insertBooking(db, f, {
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      const edge = await insertBooking(db, f, {
        startsAt: at(7, 17),
        endsAt: at(7, 18, 30),
      });
      const otherCourt = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      await insertBooking(db, f, { startsAt: at(7, 19), endsAt: at(7, 20) });
      await insertBooking(db, f, {
        status: "cancelled",
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() - 1),
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      const liveHold = await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() + 60_000),
        startsAt: at(7, 18, 30),
        endsAt: at(7, 19, 30),
        courtId: f.court2,
      });

      const wholeVenue = await addClosure(db, {
        venueId: f.venueId,
        startsAt: at(7, 18),
        endsAt: at(7, 19),
        actor: manager,
        now: NOW,
      });
      expect(new Set(wholeVenue.affectedBookingIds)).toEqual(
        new Set([inside.id, edge.id, otherCourt.id, liveHold.id]),
      );

      const oneCourt = await addClosure(db, {
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: at(7, 18),
        endsAt: at(7, 19),
        actor: manager,
        now: NOW,
      });
      expect(new Set(oneCourt.affectedBookingIds)).toEqual(
        new Set([inside.id, edge.id]),
      );

      const none = await addClosure(db, {
        venueId: f.venueId,
        startsAt: at(9, 0),
        endsAt: at(10, 0),
        actor: manager,
        now: NOW,
      });
      expect(none.affectedBookingIds).toEqual([]);

      const stillConfirmed = await db.query.bookings.findFirst();
      expect(stillConfirmed?.status).toBe("confirmed");
    });
  });
});

describe("deleteCourt Booking guard", () => {
  it("refuses while an upcoming occupying Booking exists", async () => {
    await withBookableVenue(async (db, f) => {
      const manager = { userId: f.manager, publicMetadata: undefined };
      await insertBooking(db, f, { startsAt: at(7, 18), endsAt: at(7, 19) });
      await expect(
        deleteCourt(db, { courtId: f.court1, actor: manager, now: NOW }),
      ).rejects.toThrow("Cancel its Bookings first");

      await insertBooking(db, f, {
        courtId: f.court2,
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() + 60_000),
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      await expect(
        deleteCourt(db, { courtId: f.court2, actor: manager, now: NOW }),
      ).rejects.toThrow("Cancel its Bookings first");
    });
  });

  it("deletes a Court whose Bookings are all cancelled, expired or lapsed only when it has no history", async () => {
    await withBookableVenue(async (db, f) => {
      const manager = { userId: f.manager, publicMetadata: undefined };
      await deleteCourt(db, { courtId: f.court2, actor: manager, now: NOW });
      expect(
        await db.query.courts.findFirst({ where: eq(courts.id, f.court2) }),
      ).toBeUndefined();

      await insertBooking(db, f, {
        status: "cancelled",
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      await expect(
        deleteCourt(db, { courtId: f.court1, actor: manager, now: NOW }),
      ).rejects.toThrow("Booking history");
    });
  });

  it("deletes a Court with no Bookings", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        deleteCourt(db, {
          courtId: f.court1,
          actor: { userId: f.manager, publicMetadata: undefined },
          now: NOW,
        }),
      ).resolves.toEqual({ id: f.court1 });
    });
  });
});
