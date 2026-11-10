import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db";

import {
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { searchVenueCustomers } from "./searchCustomers";

describe("bookings.searchCustomers", () => {
  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });

  it("lists this Venue's Customers first with their Booking count and phone", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(user)
        .set({ name: "Hassan Baji", phoneNumber: "+973 3612 4408" })
        .where(eq(user.id, f.customer));
      await db
        .update(user)
        .set({ name: "Hassan Ali", phoneNumber: "+973 3900 1123" })
        .where(eq(user.id, f.other));
      await insertBooking(db, f);
      await insertBooking(db, f, { startsAt: at(8, 18), endsAt: at(8, 19) });

      const results = await searchVenueCustomers(db, {
        venueId: f.venueId,
        query: "hassan",
        actor: asManager(f.manager),
      });
      expect(results).toEqual([
        expect.objectContaining({
          kind: "user",
          userId: f.customer,
          name: "Hassan Baji",
          phone: "+973 3612 4408",
          bookingCount: 2,
        }),
      ]);

      const byPartOfNumber = await searchVenueCustomers(db, {
        venueId: f.venueId,
        query: "36124",
        actor: asManager(f.manager),
      });
      expect(
        byPartOfNumber.map((row) => row.kind === "user" && row.userId),
      ).toEqual([]);
      const byCustomerDigits = await searchVenueCustomers(db, {
        venueId: f.venueId,
        query: "3612 440",
        actor: asManager(f.manager),
      });
      expect(
        byCustomerDigits.map((row) => row.kind === "user" && row.userId),
      ).toEqual([f.customer]);
    });
  });

  it("finds anyone else on Temba only by their full phone number", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(user)
        .set({ name: "Hassan Ali", phoneNumber: "+973 3900 1123" })
        .where(eq(user.id, f.other));

      for (const query of ["hassan", "39001", "3900112", "+97339001"]) {
        const results = await searchVenueCustomers(db, {
          venueId: f.venueId,
          query,
          actor: asManager(f.manager),
        });
        expect(results).toEqual([]);
      }

      for (const query of ["+973 3900 1123", "39001123", "0097339001123"]) {
        const results = await searchVenueCustomers(db, {
          venueId: f.venueId,
          query,
          actor: asManager(f.manager),
        });
        expect(results).toEqual([
          expect.objectContaining({
            kind: "user",
            userId: f.other,
            phone: "+973 3900 1123",
            bookingCount: 0,
          }),
        ]);
      }
    });
  });

  it("finds Guests of this Venue by name or phone, one row per phone", async () => {
    await withBookableVenue(async (db, f) => {
      const guest = {
        userId: null,
        guestName: "Khalid",
        guestPhone: "+973 3300 1111",
        source: "venue" as const,
      };
      await insertBooking(db, f, guest);
      await insertBooking(db, f, {
        ...guest,
        guestName: "Khalid M.",
        startsAt: at(8, 18),
        endsAt: at(8, 19),
      });
      await insertBooking(db, f, {
        ...guest,
        venueId: f.elsewhereVenueId,
        courtId: f.elsewhereCourt,
        guestName: "Khalid Elsewhere",
        guestPhone: "+973 3999 9999",
      });

      const byPhone = await searchVenueCustomers(db, {
        venueId: f.venueId,
        query: "33001111",
        actor: asManager(f.manager),
      });
      expect(byPhone.filter((row) => row.kind === "guest")).toEqual([
        {
          kind: "guest",
          name: "Khalid M.",
          phone: "+973 3300 1111",
          bookingCount: 2,
        },
      ]);

      const byName = await searchVenueCustomers(db, {
        venueId: f.venueId,
        query: "khal",
        actor: asManager(f.manager),
      });
      expect(byName.map((row) => row.phone)).toEqual(["+973 3300 1111"]);
    });
  });

  it("is for the Venue's managers only", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        searchVenueCustomers(db, {
          venueId: f.venueId,
          query: "anyone",
          actor: asManager(f.customer),
        }),
      ).rejects.toMatchObject({ code: "FORBIDDEN" });
    });
  });
});
