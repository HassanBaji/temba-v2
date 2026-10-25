import { describe, expect, it } from "vitest";

import { courts, venueClosures, venuePricingRules, venues } from "@repo/db";
import { priceForInterval } from "@repo/domain/booking-price";
import { eq } from "drizzle-orm";

import {
  NOW,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { venueAvailability } from "#src/routers/bookings/venueAvailability";

describe("bookings.venueAvailability", () => {
  it("lists bookable starts with durations and prices that equal priceForInterval", async () => {
    await withBookableVenue(async (db, f) => {
      await db.delete(venuePricingRules);
      const rules = [
        {
          venueId: f.venueId,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          startMinutes: 0,
          endMinutes: 17 * 60,
          hourlyRateFils: 10_000,
        },
        {
          venueId: f.venueId,
          weekdays: [0, 1, 2, 3, 4, 5, 6],
          startMinutes: 17 * 60,
          endMinutes: 1440,
          hourlyRateFils: 16_000,
        },
      ];
      await db.insert(venuePricingRules).values(rules);

      const result = await venueAvailability(db, {
        venueId: f.venueId,
        day: "2030-01-07",
        now: NOW,
      });
      expect(result.day).toBe("2030-01-07");
      expect(result.courts.map((court) => court.name)).toEqual([
        "Court 1",
        "Court 2",
      ]);
      const court = result.courts[0]!;
      const slot = court.slots.find(
        (candidate) => candidate.startsAt.getTime() === at(7, 16, 30).getTime(),
      )!;
      for (const { minutes, priceFils } of slot.durations) {
        expect(
          priceForInterval(
            rules.map((rule) => ({ ...rule, courtId: null })),
            {
              courtId: court.id,
              startsAt: slot.startsAt,
              endsAt: new Date(slot.startsAt.getTime() + minutes * 60_000),
            },
          ),
        ).toEqual({ fils: priceFils });
      }
      expect(slot.durations.map((d) => d.minutes)).toEqual([60, 90]);
      expect(slot.durations[0]?.priceFils).toBe(10_000);
    });
  });

  it("omits past Slots, taken Slots, runs past closing, and Closed Courts", async () => {
    await withBookableVenue(async (db, f) => {
      const today = await venueAvailability(db, {
        venueId: f.venueId,
        day: "2030-01-05",
        now: NOW,
      });
      expect(today.courts[0]!.slots[0]?.startsAt).toEqual(at(5, 13));

      await insertBooking(db, f, { startsAt: at(7, 18), endsAt: at(7, 19) });
      await db.insert(venueClosures).values({
        venueId: f.venueId,
        courtId: f.court2,
        startsAt: at(7, 0),
        endsAt: at(8, 0),
      });
      const result = await venueAvailability(db, {
        venueId: f.venueId,
        day: "2030-01-07",
        now: NOW,
      });
      expect(result.courts.map((court) => court.name)).toEqual(["Court 1"]);
      const slots = result.courts[0]!.slots;
      const starts = slots.map((slot) => slot.startsAt.getTime());
      expect(starts).not.toContain(at(7, 18).getTime());
      expect(starts).not.toContain(at(7, 18, 30).getTime());
      expect(starts).not.toContain(at(7, 17, 30).getTime());
      expect(
        slots.find((slot) => slot.startsAt.getTime() === at(7, 17).getTime())
          ?.durations,
      ).toEqual([{ minutes: 60, priceFils: 10_000 }]);
      const last = slots.at(-1)!;
      expect(last.startsAt).toEqual(at(7, 22));
      expect(last.durations.map((d) => d.minutes)).toEqual([60]);
      expect(
        slots
          .find((slot) => slot.startsAt.getTime() === at(7, 21, 30).getTime())
          ?.durations.map((d) => d.minutes),
      ).toEqual([60, 90]);
    });
  });

  it("refuses days outside today and the horizon, and Venues that are not bookable", async () => {
    await withBookableVenue(async (db, f) => {
      const ask = (day: string) =>
        venueAvailability(db, { venueId: f.venueId, day, now: NOW });
      await expect(ask("2030-01-04")).rejects.toThrow(
        "outside the booking window",
      );
      await expect(ask("2030-01-19")).rejects.toThrow(
        "outside the booking window",
      );
      await expect(ask("2030-02-31")).rejects.toThrow("Not a valid day");
      await expect(ask("2030-01-18")).resolves.toBeDefined();

      await db
        .update(venues)
        .set({ acceptingBookings: false })
        .where(eq(venues.id, f.venueId));
      await expect(ask("2030-01-07")).rejects.toThrow("Venue not found");
    });
  });
});

describe("bookings.venueAvailability by sport", () => {
  it("returns only the sport's Courts and every Court without sport", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(courts)
        .set({ sport: "football" })
        .where(eq(courts.id, f.court2));
      const args = { venueId: f.venueId, day: "2030-01-07", now: NOW };

      const all = await venueAvailability(db, args);
      expect(all.courts.map((court) => court.name)).toEqual([
        "Court 1",
        "Court 2",
      ]);
      const football = await venueAvailability(db, {
        ...args,
        sport: "football",
      });
      expect(football.courts.map((court) => court.id)).toEqual([f.court2]);
      expect(football.courts[0]!.slots).toEqual(all.courts[1]!.slots);
      const padel = await venueAvailability(db, { ...args, sport: "padel" });
      expect(padel.courts.map((court) => court.id)).toEqual([f.court1]);
    });
  });
});
