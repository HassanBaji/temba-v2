import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { courts, venueOpeningHours, venuePricingRules, venues } from "@repo/db";

import {
  NOW,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { listBookableVenues } from "#src/routers/bookings/listBookableVenues";
import { venueForBooking } from "#src/routers/bookings/venueForBooking";

describe("bookings.listBookableVenues", () => {
  it("lists accepting, live Venues with a Court and a Pricing rule, sorted by name", async () => {
    await withBookableVenue(async (db, f) => {
      await db.insert(venuePricingRules).values({
        venueId: f.venueId,
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        startMinutes: 0,
        endMinutes: 1440,
        hourlyRateFils: 8_000,
        label: "Cheap",
        courtId: f.court1,
      });
      const [second] = await db
        .insert(venues)
        .values({
          name: "Aardvark Courts",
          city: "Manama",
          country: "BH",
          acceptingBookings: true,
        })
        .returning({ id: venues.id });
      await db.insert(courts).values({ venueId: second!.id, name: "A" });
      await db.insert(venuePricingRules).values({
        venueId: second!.id,
        weekdays: [0],
        startMinutes: 0,
        endMinutes: 600,
        hourlyRateFils: 5_000,
      });
      await db.insert(venueOpeningHours).values([
        {
          venueId: second!.id,
          weekday: 6,
          opensAtMinutes: 600,
          closesAtMinutes: 700,
        },
        {
          venueId: second!.id,
          weekday: 6,
          opensAtMinutes: 800,
          closesAtMinutes: 900,
        },
      ]);

      const list = await listBookableVenues(db, { now: NOW });
      expect(list.map((venue) => venue.name)).toEqual([
        "Aardvark Courts",
        "Padel Central",
      ]);
      expect(list[0]).toMatchObject({
        courtCount: 1,
        fromHourlyRateFils: 5_000,
        todayOpen: [
          { opensAtMinutes: 600, closesAtMinutes: 700 },
          { opensAtMinutes: 800, closesAtMinutes: 900 },
        ],
      });
      expect(list[1]).toMatchObject({
        courtCount: 2,
        fromHourlyRateFils: 8_000,
        todayOpen: [{ opensAtMinutes: 480, closesAtMinutes: 1380 }],
      });

      expect(
        await listBookableVenues(db, { city: " manama ", now: NOW }),
      ).toHaveLength(2);
      expect(await listBookableVenues(db, { city: "Riffa", now: NOW })).toEqual(
        [],
      );
    });
  });

  it("leaves out Venues that are archived, not accepting, courtless or unpriced", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(venues)
        .set({ acceptingBookings: true })
        .where(eq(venues.id, f.elsewhereVenueId));
      expect(await listBookableVenues(db, { now: NOW })).toHaveLength(1);

      await db.delete(venuePricingRules);
      expect(await listBookableVenues(db, { now: NOW })).toEqual([]);
    });
  });

  it("drops an archived Venue", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(venues)
        .set({ archivedAt: NOW })
        .where(eq(venues.id, f.venueId));
      expect(await listBookableVenues(db, { now: NOW })).toEqual([]);
    });
  });
});

describe("bookings.venueForBooking", () => {
  it("returns the booking page with Courts, hours by weekday, options and policy lines", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(venues)
        .set({ description: "Indoor", bookingNotes: "First floor" })
        .where(eq(venues.id, f.venueId));
      const venue = await venueForBooking(db, { venueId: f.venueId, now: NOW });
      expect(venue).toMatchObject({
        id: f.venueId,
        name: "Padel Central",
        description: "Indoor",
        bookingNotes: "First floor",
        slotMinutes: 30,
        durationOptionsMinutes: [60, 90],
        bookingHorizonDays: 14,
        payment: { mode: "at_venue", methods: ["at_venue"] },
      });
      expect(venue.courts.map((court) => court.name)).toEqual([
        "Court 1",
        "Court 2",
      ]);
      expect(venue.openingHours).toHaveLength(7);
      expect(venue.openingHours[3]).toEqual({
        weekday: 3,
        windows: [{ opensAtMinutes: 480, closesAtMinutes: 1380 }],
      });
      expect(venue.cancellationPolicyLines[0]).toBe(
        "Full refund until 24 hours before",
      );
    });
  });

  it("is NOT_FOUND when the Venue is archived, not accepting, or unknown", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        venueForBooking(db, { venueId: f.elsewhereVenueId, now: NOW }),
      ).rejects.toThrow("Venue not found");
      await db
        .update(venues)
        .set({ archivedAt: NOW })
        .where(eq(venues.id, f.venueId));
      await expect(
        venueForBooking(db, { venueId: f.venueId, now: NOW }),
      ).rejects.toThrow("Venue not found");
      await expect(
        venueForBooking(db, {
          venueId: "00000000-0000-4000-8000-000000000000",
          now: NOW,
        }),
      ).rejects.toThrow("Venue not found");
    });
  });

  describe("with a hosted-redirect provider", () => {
    useFakeProvider();

    it("offers payment online first, then at the Venue", async () => {
      await withBookableVenue(async (db, f) => {
        const venue = await venueForBooking(db, {
          venueId: f.venueId,
          now: NOW,
        });
        expect(venue.payment).toEqual({
          mode: "online",
          methods: ["card", "benefit", "benefitpay", "at_venue"],
        });
      });
    });

    it("offers online only when the Venue refuses payment at the Venue", async () => {
      await withBookableVenue(async (db, f) => {
        await db
          .update(venues)
          .set({ payAtVenueAllowed: false })
          .where(eq(venues.id, f.venueId));
        const venue = await venueForBooking(db, {
          venueId: f.venueId,
          now: NOW,
        });
        expect(venue.payment).toEqual({
          mode: "online",
          methods: ["card", "benefit", "benefitpay"],
        });
      });
    });
  });
});

describe("bookings.listBookableVenues by sport", () => {
  it("counts and prices only the sport's Courts, and omits Venues without any", async () => {
    await withBookableVenue(async (db, f) => {
      await db.delete(venuePricingRules);
      await db.insert(venuePricingRules).values([
        {
          venueId: f.venueId,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          startMinutes: 0,
          endMinutes: 1440,
          hourlyRateFils: 10_000,
          courtId: f.court1,
        },
        {
          venueId: f.venueId,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          startMinutes: 0,
          endMinutes: 1440,
          hourlyRateFils: 6_000,
          courtId: f.court2,
        },
      ]);
      await db
        .update(courts)
        .set({ sport: "football" })
        .where(eq(courts.id, f.court2));

      const beforeSport = await listBookableVenues(db, { now: NOW });
      expect(beforeSport[0]).toMatchObject({
        courtCount: 2,
        fromHourlyRateFils: 6_000,
      });

      const football = await listBookableVenues(db, {
        sport: "football",
        now: NOW,
      });
      expect(football).toHaveLength(1);
      expect(football[0]).toMatchObject({
        courtCount: 1,
        fromHourlyRateFils: 6_000,
      });

      const padel = await listBookableVenues(db, { sport: "padel", now: NOW });
      expect(padel[0]).toMatchObject({
        courtCount: 1,
        fromHourlyRateFils: 10_000,
      });
    });
  });

  it("omits a padel-only Venue under football and counts Venue-wide rules", async () => {
    await withBookableVenue(async (db, f) => {
      expect(
        await listBookableVenues(db, { sport: "football", now: NOW }),
      ).toEqual([]);

      await db
        .update(courts)
        .set({ sport: "football" })
        .where(eq(courts.id, f.court1));
      const football = await listBookableVenues(db, {
        sport: "football",
        now: NOW,
      });
      expect(football.map((venue) => venue.id)).toEqual([f.venueId]);
      expect(football[0]).toMatchObject({
        courtCount: 1,
        fromHourlyRateFils: 10_000,
      });
    });
  });

  it("omits a Venue whose only pitch has no covering rule", async () => {
    await withBookableVenue(async (db, f) => {
      await db.delete(venuePricingRules);
      await db.insert(venuePricingRules).values({
        venueId: f.venueId,
        weekdays: [0],
        startMinutes: 0,
        endMinutes: 1440,
        hourlyRateFils: 7_000,
        courtId: f.court1,
      });
      await db
        .update(courts)
        .set({ sport: "football" })
        .where(eq(courts.id, f.court2));
      expect(
        await listBookableVenues(db, { sport: "football", now: NOW }),
      ).toEqual([]);
    });
  });
});
