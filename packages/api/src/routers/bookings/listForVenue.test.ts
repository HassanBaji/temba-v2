import { describe, expect, it } from "vitest";

import { bookings, venueClosures } from "@repo/db";

import {
  NOW,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { listBookingsForVenue } from "#src/routers/bookings/listForVenue";

describe("bookings.listForVenue", () => {
  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  it("returns a week of Bookings sorted by start, with holder, Court and the day grid", async () => {
    await withBookableVenue(async (db, f) => {
      const later = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
      });
      const sooner = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(7, 9),
        endsAt: at(7, 10),
        userId: null,
        guestName: "Walk-in",
        guestPhone: "+973 3333 0000",
        source: "venue",
      });
      await insertBooking(db, f, {
        startsAt: at(20, 18),
        endsAt: at(20, 19),
      });
      await db.insert(venueClosures).values({
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: at(7, 12),
        endsAt: at(7, 14),
        reason: "Resurfacing",
      });

      const result = await listBookingsForVenue(db, {
        venueId: f.venueId,
        from: "2030-01-07",
        to: "2030-01-13",
        actor: asManager(f.manager),
        now: NOW,
      });

      expect(result.bookings.map((b) => b.id)).toEqual([sooner.id, later.id]);
      expect(result.bookings[0]?.holder).toEqual({
        kind: "guest",
        name: "Walk-in",
        phone: "+973 3333 0000",
      });
      expect(result.bookings[1]?.holder).toMatchObject({
        kind: "user",
        name: "Customer",
      });
      expect(result.bookings[1]?.courtName).toBe("Court 1");
      expect(result.grid.slotMinutes).toBe(30);
      expect(result.grid.courts.map((c) => c.name)).toEqual([
        "Court 1",
        "Court 2",
      ]);
      expect(result.grid.days).toHaveLength(7);
      expect(result.grid.days[0]).toEqual({
        day: "2030-01-07",
        windows: [{ opensAtMinutes: 480, closesAtMinutes: 1380 }],
      });
      expect(result.grid.closures).toHaveLength(1);
      expect(result.grid.closures[0]).toMatchObject({
        courtId: f.court1,
        reason: "Resurfacing",
      });
    });
  });

  it("still returns a Booking outside Opening hours", async () => {
    await withBookableVenue(async (db, f) => {
      const early = await insertBooking(db, f, {
        startsAt: at(7, 5),
        endsAt: at(7, 6),
        source: "venue",
      });
      const result = await listBookingsForVenue(db, {
        venueId: f.venueId,
        from: "2030-01-07",
        to: "2030-01-07",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.bookings.map((b) => b.id)).toEqual([early.id]);
    });
  });

  it("shows live pending-payment holds and hides lapsed holds and expired rows", async () => {
    await withBookableVenue(async (db, f) => {
      const live = await insertBooking(db, f, {
        startsAt: at(7, 10),
        endsAt: at(7, 11),
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() + 60_000),
      });
      await insertBooking(db, f, {
        startsAt: at(7, 12),
        endsAt: at(7, 13),
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() - 60_000),
      });
      const expired = await insertBooking(db, f, {
        startsAt: at(7, 14),
        endsAt: at(7, 15),
        status: "expired",
      });
      const range = {
        venueId: f.venueId,
        from: "2030-01-07",
        to: "2030-01-07",
        actor: asManager(f.manager),
        now: NOW,
      };

      const byDefault = await listBookingsForVenue(db, range);
      expect(byDefault.bookings.map((b) => b.id)).toEqual([live.id]);
      expect(byDefault.bookings[0]?.status).toBe("pending_payment");

      const asked = await listBookingsForVenue(db, {
        ...range,
        status: ["pending_payment", "expired"],
      });
      expect(asked.bookings.map((b) => b.id)).toEqual([live.id, expired.id]);
    });
  });

  it("narrows by Court, status, payment status and source", async () => {
    await withBookableVenue(async (db, f) => {
      const paidApp = await insertBooking(db, f, {
        startsAt: at(7, 9),
        endsAt: at(7, 10),
        paymentStatus: "paid",
      });
      const cancelledVenue = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(7, 11),
        endsAt: at(7, 12),
        status: "cancelled",
        source: "venue",
      });
      const range = {
        venueId: f.venueId,
        from: "2030-01-07",
        to: "2030-01-07",
        actor: asManager(f.manager),
        now: NOW,
      };
      const ids = async (patch: object) =>
        (await listBookingsForVenue(db, { ...range, ...patch })).bookings.map(
          (b) => b.id,
        );

      expect(await ids({})).toEqual([paidApp.id, cancelledVenue.id]);
      expect(await ids({ courtId: f.court2 })).toEqual([cancelledVenue.id]);
      expect(await ids({ status: ["cancelled"] })).toEqual([cancelledVenue.id]);
      expect(await ids({ paymentStatus: ["paid"] })).toEqual([paidApp.id]);
      expect(await ids({ source: ["venue"] })).toEqual([cancelledVenue.id]);
      expect(await ids({ source: ["venue"], status: ["confirmed"] })).toEqual(
        [],
      );
    });
  });

  it("includes a Booking that overlaps the range edge and omits one outside it", async () => {
    await withBookableVenue(async (db, f) => {
      const overnight = await insertBooking(db, f, {
        startsAt: at(6, 23, 30),
        endsAt: at(7, 0, 30),
      });
      await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(8, 0),
        endsAt: at(8, 1),
      });
      const result = await listBookingsForVenue(db, {
        venueId: f.venueId,
        from: "2030-01-07",
        to: "2030-01-07",
        actor: asManager(f.manager),
        now: NOW,
      });
      expect(result.bookings.map((b) => b.id)).toEqual([overnight.id]);
    });
  });

  it("refuses a range over 31 days, a reversed range and a bad day", async () => {
    await withBookableVenue(async (db, f) => {
      const base = {
        venueId: f.venueId,
        actor: asManager(f.manager),
        now: NOW,
      };
      await expect(
        listBookingsForVenue(db, {
          ...base,
          from: "2030-01-01",
          to: "2030-02-09",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        listBookingsForVenue(db, {
          ...base,
          from: "2030-01-10",
          to: "2030-01-09",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      await expect(
        listBookingsForVenue(db, {
          ...base,
          from: "2030-02-30",
          to: "2030-02-30",
        }),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      const month = await listBookingsForVenue(db, {
        ...base,
        from: "2030-01-01",
        to: "2030-01-31",
      });
      expect(month.grid.days).toHaveLength(31);
    });
  });

  it("refuses a user who does not manage the Venue", async () => {
    await withBookableVenue(async (db, f) => {
      await insertBooking(db, f);
      for (const userId of [f.other, f.customer]) {
        await expect(
          listBookingsForVenue(db, {
            venueId: f.venueId,
            from: "2030-01-07",
            to: "2030-01-07",
            actor: asManager(userId),
            now: NOW,
          }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
      }
      await expect(
        listBookingsForVenue(db, {
          venueId: f.elsewhereVenueId,
          from: "2030-01-07",
          to: "2030-01-07",
          actor: asManager(f.manager),
          now: NOW,
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });

  it("lets an Operator read any Venue", async () => {
    await withBookableVenue(async (db, f) => {
      const result = await listBookingsForVenue(db, {
        venueId: f.elsewhereVenueId,
        from: "2030-01-07",
        to: "2030-01-07",
        actor: { userId: f.other, publicMetadata: { operator: true } },
        now: NOW,
      });
      expect(result.bookings).toEqual([]);
    });
  });
});
