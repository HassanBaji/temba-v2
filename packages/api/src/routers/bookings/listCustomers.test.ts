import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { user } from "@repo/db";

import {
  NOW,
  at,
  insertBooking,
  insertPayment,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { listVenueCustomers } from "./listCustomers";

describe("bookings.listCustomers", () => {
  const asManager = (userId: string) => ({ userId, publicMetadata: undefined });
  const guest = {
    userId: null,
    guestName: "Khalid",
    guestPhone: "+973 3300 1111",
    source: "venue" as const,
  };

  it("lists only people who booked at this Venue, never every Temba User", async () => {
    await withBookableVenue(async (db, f) => {
      await insertBooking(db, f);
      await insertBooking(db, f, {
        userId: f.other,
        venueId: f.elsewhereVenueId,
        courtId: f.elsewhereCourt,
      });

      const result = await listVenueCustomers(db, {
        venueId: f.venueId,
        actor: asManager(f.manager),
        now: NOW,
      });

      expect(result.customers.map((c) => c.userId)).toEqual([f.customer]);
      expect(result.total).toBe(1);
    });
  });

  it("counts only this Venue's Bookings for a User who books at two Venues", async () => {
    await withBookableVenue(async (db, f) => {
      await insertBooking(db, f, { paymentStatus: "paid" });
      await insertBooking(db, f, {
        venueId: f.elsewhereVenueId,
        courtId: f.elsewhereCourt,
        paymentStatus: "paid",
      });
      await insertBooking(db, f, {
        venueId: f.elsewhereVenueId,
        courtId: f.elsewhereCourt,
        startsAt: at(8, 18),
        endsAt: at(8, 19),
        status: "no_show",
      });

      const result = await listVenueCustomers(db, {
        venueId: f.venueId,
        actor: asManager(f.manager),
        now: NOW,
      });

      expect(result.customers).toEqual([
        expect.objectContaining({
          kind: "user",
          userId: f.customer,
          bookingCount: 1,
          noShowCount: 0,
          paidFils: 10_000,
          owedFils: 0,
        }),
      ]);
    });
  });

  it("aggregates paid, refunded and owed, and never counts cancellation charges as owed", async () => {
    await withBookableVenue(async (db, f) => {
      const refunded = await insertBooking(db, f, {
        startsAt: at(3, 18),
        endsAt: at(3, 19),
        paymentStatus: "partially_refunded",
      });
      await insertPayment(db, refunded.id, {
        status: "partially_refunded",
        method: "cash",
        refundedFils: 4_000,
      });
      await insertBooking(db, f, {
        startsAt: at(4, 18),
        endsAt: at(4, 19),
        status: "no_show",
      });
      await insertBooking(db, f, {
        startsAt: at(9, 18),
        endsAt: at(9, 19),
        priceFils: 15_000,
      });
      await insertBooking(db, f, {
        startsAt: at(10, 18),
        endsAt: at(10, 19),
        status: "cancelled",
        cancellationChargeFils: 10_000,
      });
      await insertBooking(db, f, {
        startsAt: at(11, 18),
        endsAt: at(11, 19),
        status: "expired",
      });
      await insertBooking(db, f, {
        startsAt: at(12, 18),
        endsAt: at(12, 19),
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() - 60_000),
      });

      const [customer] = (
        await listVenueCustomers(db, {
          venueId: f.venueId,
          actor: asManager(f.manager),
          now: NOW,
        })
      ).customers;

      expect(customer).toMatchObject({
        bookingCount: 4,
        cancelledCount: 1,
        noShowCount: 1,
        paidFils: 10_000,
        refundedFils: 4_000,
        owedFils: 10_000 + 15_000,
        cancellationChargesFils: 10_000,
        firstBookingAt: at(3, 18),
        lastBookingAt: at(10, 18),
      });
    });
  });

  it("lists Guests by phone with no userId and their latest name", async () => {
    await withBookableVenue(async (db, f) => {
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
        guestPhone: "+973 3999 9999",
      });

      const result = await listVenueCustomers(db, {
        venueId: f.venueId,
        actor: asManager(f.manager),
        now: NOW,
      });

      expect(result.customers).toEqual([
        expect.objectContaining({
          kind: "guest",
          userId: null,
          name: "Khalid M.",
          phone: "+973 3300 1111",
          bookingCount: 2,
        }),
      ]);
    });
  });

  it("sorts by last visit, Bookings, no-shows, owed and name", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(user)
        .set({ name: "Zayed" })
        .where(eq(user.id, f.customer));
      await db.update(user).set({ name: "Ali" }).where(eq(user.id, f.other));
      await insertBooking(db, f, { startsAt: at(3, 9), endsAt: at(3, 10) });
      await insertBooking(db, f, {
        startsAt: at(4, 9),
        endsAt: at(4, 10),
        status: "no_show",
        paymentStatus: "paid",
      });
      await insertBooking(db, f, {
        userId: f.other,
        startsAt: at(5, 9),
        endsAt: at(5, 10),
        paymentStatus: "paid",
      });
      await insertBooking(db, f, {
        ...guest,
        startsAt: at(1, 9),
        endsAt: at(1, 10),
        priceFils: 30_000,
      });

      const order = async (
        sort: "lastVisit" | "bookings" | "noShows" | "owed" | "name",
      ) =>
        (
          await listVenueCustomers(db, {
            venueId: f.venueId,
            sort,
            actor: asManager(f.manager),
            now: NOW,
          })
        ).customers.map((c) => c.name);

      expect(await order("lastVisit")).toEqual(["Ali", "Zayed", "Khalid"]);
      expect(await order("bookings")).toEqual(["Zayed", "Ali", "Khalid"]);
      expect(await order("noShows")).toEqual(["Zayed", "Ali", "Khalid"]);
      expect(await order("owed")).toEqual(["Khalid", "Zayed", "Ali"]);
      expect(await order("name")).toEqual(["Ali", "Khalid", "Zayed"]);
    });
  });

  it("searches name, username and phone across Users and Guests", async () => {
    await withBookableVenue(async (db, f) => {
      await db
        .update(user)
        .set({
          name: "Hassan Baji",
          username: "hbaji",
          phoneNumber: "+973 3612 4408",
        })
        .where(eq(user.id, f.customer));
      await insertBooking(db, f);
      await insertBooking(db, f, guest);

      const search = async (query: string) =>
        (
          await listVenueCustomers(db, {
            venueId: f.venueId,
            query,
            actor: asManager(f.manager),
            now: NOW,
          })
        ).customers.map((c) => c.name);

      expect(await search("hassan")).toEqual(["Hassan Baji"]);
      expect(await search("HBAJ")).toEqual(["Hassan Baji"]);
      expect(await search("3612 4408")).toEqual(["Hassan Baji"]);
      expect(await search("khal")).toEqual(["Khalid"]);
      expect(await search("33001111")).toEqual(["Khalid"]);
      expect(await search("nobody")).toEqual([]);
    });
  });

  it("pages with a cursor and reports the total", async () => {
    await withBookableVenue(async (db, f) => {
      for (const day of [1, 2, 3]) {
        await insertBooking(db, f, {
          ...guest,
          guestPhone: `+973 3300 000${day}`,
          startsAt: at(day, 9),
          endsAt: at(day, 10),
        });
      }
      const page = (cursor?: number) =>
        listVenueCustomers(db, {
          venueId: f.venueId,
          cursor,
          limit: 2,
          actor: asManager(f.manager),
          now: NOW,
        });

      const first = await page();
      expect(first.customers.map((c) => c.phone)).toEqual([
        "+973 3300 0003",
        "+973 3300 0002",
      ]);
      expect(first.total).toBe(3);
      expect(first.nextCursor).toBe(2);

      const second = await page(first.nextCursor!);
      expect(second.customers.map((c) => c.phone)).toEqual(["+973 3300 0001"]);
      expect(second.nextCursor).toBeNull();
    });
  });

  it("refuses someone who does not manage the Venue", async () => {
    await withBookableVenue(async (db, f) => {
      await expect(
        listVenueCustomers(db, {
          venueId: f.venueId,
          actor: asManager(f.customer),
          now: NOW,
        }),
      ).rejects.toBeInstanceOf(TRPCError);
    });
  });
});
