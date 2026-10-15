import { eq, sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookings, venueClosures, venues } from "@repo/db";

import {
  NOW,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { reserveBooking } from "#src/bookings/reserve";
import { createBooking } from "#src/routers/bookings/create";

const rejects = (promise: Promise<unknown>, message: string | RegExp) =>
  expect(promise).rejects.toThrow(message);

describe("bookings.create", () => {
  it("confirms the Booking in one step with a pending payment and the Venue's price", async () => {
    await withBookableVenue(async (db, f) => {
      const result = await createBooking(db, {
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: at(7, 18),
        durationMinutes: 90,
        userId: f.customer,
        now: NOW,
      });
      expect(result.payment).toEqual({ kind: "deferred" });
      expect(result.booking).toMatchObject({
        status: "confirmed",
        paymentStatus: "pending",
        source: "app",
        priceFils: 15_000,
        holdExpiresAt: null,
        startsAt: at(7, 18),
        endsAt: at(7, 19, 30),
      });
      const row = await db.query.bookings.findFirst();
      expect(row).toMatchObject({
        userId: f.customer,
        createdByUserId: f.customer,
        venueId: f.venueId,
        courtId: f.court1,
      });
    });
  });

  it("snapshots the cancellation policy and keeps it when the Venue edits its policy", async () => {
    await withBookableVenue(async (db, f) => {
      const policy = {
        tiers: [{ hoursBefore: 48, refundPercent: 80 }],
        lateRefundPercent: 10,
        customerCancelUntilMinutes: 30,
      };
      await db
        .update(venues)
        .set({ cancellationPolicy: policy })
        .where(eq(venues.id, f.venueId));
      const { booking } = await createBooking(db, {
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: at(7, 18),
        durationMinutes: 60,
        userId: f.customer,
        now: NOW,
      });
      expect(booking.cancellationPolicy).toEqual(policy);

      await db
        .update(venues)
        .set({
          cancellationPolicy: {
            tiers: [],
            lateRefundPercent: 100,
            customerCancelUntilMinutes: 0,
          },
        })
        .where(eq(venues.id, f.venueId));
      const row = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });
      expect(row?.cancellationPolicy).toEqual(policy);
    });
  });

  describe("refuses", () => {
    const base = (f: {
      venueId: string;
      court1: string;
      customer: string;
    }) => ({
      venueId: f.venueId,
      courtId: f.court1,
      startsAt: at(7, 18),
      durationMinutes: 60,
      userId: f.customer,
      now: NOW,
    });

    it("a Venue that is not accepting bookings", async () => {
      await withBookableVenue(async (db, f) => {
        await db
          .update(venues)
          .set({ acceptingBookings: false })
          .where(eq(venues.id, f.venueId));
        await rejects(createBooking(db, base(f)), "not accepting bookings");
      });
    });

    it("an archived Venue", async () => {
      await withBookableVenue(async (db, f) => {
        await db
          .update(venues)
          .set({ archivedAt: NOW })
          .where(eq(venues.id, f.venueId));
        await rejects(createBooking(db, base(f)), "archived");
      });
    });

    it("a Venue with no Court", async () => {
      await withBookableVenue(async (db, f) => {
        await rejects(
          createBooking(db, {
            ...base(f),
            venueId: f.elsewhereVenueId,
          }),
          /not accepting|no Courts/,
        );
        await db
          .update(venues)
          .set({ acceptingBookings: true })
          .where(eq(venues.id, f.elsewhereVenueId));
        await db.execute(
          sql`delete from courts where venue_id = ${f.elsewhereVenueId}`,
        );
        await rejects(
          createBooking(db, { ...base(f), venueId: f.elsewhereVenueId }),
          "no Courts",
        );
      });
    });

    it("an unknown Venue", async () => {
      await withBookableVenue(async (db, f) => {
        await rejects(
          createBooking(db, {
            ...base(f),
            venueId: "00000000-0000-4000-8000-000000000000",
          }),
          "Venue not found",
        );
      });
    });

    it("a Court on another Venue", async () => {
      await withBookableVenue(async (db, f) => {
        await rejects(
          createBooking(db, { ...base(f), courtId: f.elsewhereCourt }),
          "does not belong to this Venue",
        );
      });
    });

    it("a start off the grid, a duration the Venue does not offer, and a time outside Opening hours", async () => {
      await withBookableVenue(async (db, f) => {
        await rejects(
          createBooking(db, { ...base(f), startsAt: at(7, 18, 15) }),
          "booking grid",
        );
        await rejects(
          createBooking(db, { ...base(f), durationMinutes: 45 }),
          "duration is not offered",
        );
        await rejects(
          createBooking(db, { ...base(f), startsAt: at(7, 7) }),
          "not open",
        );
        await rejects(
          createBooking(db, {
            ...base(f),
            startsAt: at(7, 22),
            durationMinutes: 90,
          }),
          "not open",
        );
      });
    });

    it("a time inside a Closure for the Venue or for that Court", async () => {
      await withBookableVenue(async (db, f) => {
        await db.insert(venueClosures).values({
          venueId: f.venueId,
          courtId: f.court1,
          startsAt: at(7, 18, 30),
          endsAt: at(7, 20),
        });
        await rejects(createBooking(db, base(f)), "unavailable");
        await createBooking(db, { ...base(f), courtId: f.court2 });

        await db.insert(venueClosures).values({
          venueId: f.venueId,
          startsAt: at(8, 0),
          endsAt: at(9, 0),
        });
        await rejects(
          createBooking(db, {
            ...base(f),
            courtId: f.court2,
            startsAt: at(8, 10),
          }),
          "unavailable",
        );
      });
    });

    it("a time no Pricing rule covers", async () => {
      await withBookableVenue(async (db, f) => {
        await db.execute(sql`delete from venue_pricing_rules`);
        await rejects(createBooking(db, base(f)), "cannot be booked");
      });
    });

    it("a start before now plus the minimum lead, and one beyond the horizon", async () => {
      await withBookableVenue(async (db, f) => {
        await rejects(
          createBooking(db, { ...base(f), startsAt: at(5, 12, 30) }),
          "too soon",
        );
        await createBooking(db, { ...base(f), startsAt: at(5, 13) });
        await rejects(
          createBooking(db, { ...base(f), startsAt: at(5 + 14, 18) }),
          "too far",
        );
        await createBooking(db, { ...base(f), startsAt: at(5 + 13, 18) });
      });
    });

    it("an interval that overlaps an occupying Booking, but allows back-to-back", async () => {
      await withBookableVenue(async (db, f) => {
        await createBooking(db, base(f));
        await rejects(
          createBooking(db, { ...base(f), startsAt: at(7, 18, 30) }),
          "That slot was just taken",
        );
        await rejects(
          createBooking(db, {
            ...base(f),
            startsAt: at(7, 17),
            durationMinutes: 90,
          }),
          "That slot was just taken",
        );
        await createBooking(db, { ...base(f), startsAt: at(7, 19) });
        await createBooking(db, { ...base(f), startsAt: at(7, 17) });
      });
    });
  });

  it("is not blocked by cancelled, no-show, expired or lapsed pending_payment Bookings", async () => {
    await withBookableVenue(async (db, f) => {
      for (const status of ["cancelled", "no_show", "expired"] as const) {
        await insertBooking(db, f, { status });
      }
      await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() - 1000),
      });
      const { booking } = await createBooking(db, {
        venueId: f.venueId,
        courtId: f.court1,
        startsAt: at(7, 18),
        durationMinutes: 60,
        userId: f.other,
        now: NOW,
      });
      expect(booking.status).toBe("confirmed");
    });
  });

  it("is blocked by a pending_payment Booking whose hold is still live", async () => {
    await withBookableVenue(async (db, f) => {
      await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() + 60_000),
      });
      await rejects(
        createBooking(db, {
          venueId: f.venueId,
          courtId: f.court1,
          startsAt: at(7, 18),
          durationMinutes: 60,
          userId: f.other,
          now: NOW,
        }),
        "That slot was just taken",
      );
    });
  });

  it("lets exactly one of two concurrent creates for the same Court and interval win", async () => {
    await withBookableVenue(async (db, f) => {
      const attempt = (userId: string) =>
        createBooking(db, {
          venueId: f.venueId,
          courtId: f.court1,
          startsAt: at(7, 18),
          durationMinutes: 60,
          userId,
          now: NOW,
        });
      const results = await Promise.allSettled([
        attempt(f.customer),
        attempt(f.other),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const failed = results.find((r) => r.status === "rejected");
      expect(failed?.status === "rejected" && String(failed.reason)).toContain(
        "That slot was just taken",
      );
      expect(await db.query.bookings.findMany()).toHaveLength(1);
    });
  });

  it("takes the per-Court advisory lock and rechecks overlap inside reserve, even when validation passed", async () => {
    await withBookableVenue(async (db, f) => {
      await db.transaction(async (tx) => {
        const values = {
          venueId: f.venueId,
          courtId: f.court1,
          userId: f.customer,
          startsAt: at(7, 18),
          endsAt: at(7, 19),
          source: "app" as const,
          priceFils: 10_000,
          cancellationPolicy: {
            tiers: [],
            lateRefundPercent: 100,
            customerCancelUntilMinutes: 0,
          },
        };
        await reserveBooking(tx, { values, now: NOW });
        const locks = await tx.execute(
          sql`select count(*)::int as held from pg_locks where locktype = 'advisory'`,
        );
        expect(locks.rows[0]).toMatchObject({ held: 1 });
        await rejects(
          reserveBooking(tx, { values, now: NOW }),
          "That slot was just taken",
        );
      });
    });
  });
});
