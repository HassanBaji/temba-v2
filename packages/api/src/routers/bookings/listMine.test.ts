import { describe, expect, it } from "vitest";

import {
  NOW,
  at,
  insertBooking,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { listMyBookings } from "#src/routers/bookings/listMine";

describe("bookings.listMine", () => {
  it("splits upcoming (soonest first) from past (newest first), omits expired and lapsed holds, and hides other Customers' rows", async () => {
    await withBookableVenue(async (db, f) => {
      const later = await insertBooking(db, f, {
        startsAt: at(9, 18),
        endsAt: at(9, 19),
      });
      const sooner = await insertBooking(db, f, {
        courtId: f.court2,
        startsAt: at(7, 18),
        endsAt: at(7, 19),
      });
      const liveHold = await insertBooking(db, f, {
        startsAt: at(8, 18),
        endsAt: at(8, 19),
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() + 60_000),
      });
      const played = await insertBooking(db, f, {
        startsAt: at(1, 18),
        endsAt: at(1, 19),
      });
      const playedLater = await insertBooking(db, f, {
        startsAt: at(3, 18),
        endsAt: at(3, 19),
      });
      const cancelled = await insertBooking(db, f, {
        startsAt: at(10, 18),
        endsAt: at(10, 19),
        status: "cancelled",
      });
      const noShow = await insertBooking(db, f, {
        startsAt: at(2, 18),
        endsAt: at(2, 19),
        status: "no_show",
      });
      await insertBooking(db, f, {
        status: "expired",
        startsAt: at(11, 18),
        endsAt: at(11, 19),
      });
      await insertBooking(db, f, {
        status: "pending_payment",
        holdExpiresAt: new Date(NOW.getTime() - 1000),
        startsAt: at(12, 18),
        endsAt: at(12, 19),
      });
      await insertBooking(db, f, {
        userId: f.other,
        startsAt: at(13, 18),
        endsAt: at(13, 19),
      });

      const upcoming = await listMyBookings(db, {
        userId: f.customer,
        scope: "upcoming",
        now: NOW,
      });
      expect(upcoming.items.map((item) => item.id)).toEqual([
        sooner.id,
        liveHold.id,
        later.id,
      ]);
      expect(upcoming.items[0]).toMatchObject({
        venue: { name: "Padel Central" },
        court: { name: "Court 2" },
        statusLabel: "Confirmed",
        paymentStatus: "pending",
      });

      const past = await listMyBookings(db, {
        userId: f.customer,
        scope: "past",
        now: NOW,
      });
      expect(past.items.map((item) => item.id)).toEqual([
        cancelled.id,
        playedLater.id,
        noShow.id,
        played.id,
      ]);
      expect(past.nextCursor).toBeNull();
    });
  });

  it("paginates with a keyset cursor in both scopes", async () => {
    await withBookableVenue(async (db, f) => {
      const rows = [];
      for (const day of [7, 8, 9, 10, 11]) {
        rows.push(
          await insertBooking(db, f, {
            startsAt: at(day, 18),
            endsAt: at(day, 19),
          }),
        );
      }
      const collect = async (scope: "upcoming" | "past") => {
        const ids: string[] = [];
        let cursor: { startsAt: Date; id: string } | undefined;
        do {
          const page = await listMyBookings(db, {
            userId: f.customer,
            scope,
            limit: 2,
            cursor,
            now: scope === "upcoming" ? NOW : at(30, 12),
          });
          expect(page.items.length).toBeLessThanOrEqual(2);
          ids.push(...page.items.map((item) => item.id));
          cursor = page.nextCursor ?? undefined;
        } while (cursor);
        return ids;
      };
      expect(await collect("upcoming")).toEqual(rows.map((row) => row.id));
      expect(await collect("past")).toEqual(
        rows.map((row) => row.id).reverse(),
      );
    });
  });
});
