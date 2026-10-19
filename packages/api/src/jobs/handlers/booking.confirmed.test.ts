import { describe, expect, it } from "vitest";

import {
  asDb,
  insertBooking,
  recordJobs,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { handle } from "./booking.confirmed";

describe("booking.confirmed", () => {
  const jobs = recordJobs();

  it("removes the hold job and queues the manager notification", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        createdByUserId: f.customer,
      });
      await handle(asDb(db), { bookingId: booking.id });
      expect(jobs.removed).toEqual([`booking:expire:${booking.id}`]);
      expect(jobs.added).toHaveLength(1);
      expect(jobs.added[0]).toMatchObject({
        name: "notification.booking",
        payload: {
          type: "booking_created",
          bookingId: booking.id,
          actorUserId: f.customer,
        },
      });
    });
  });

  it("queues no notification for a Booking that is no longer confirmed", async () => {
    await withBookableVenue(async (db, f) => {
      const booking = await insertBooking(db, f, {
        status: "cancelled",
        cancelledBy: "customer",
      });
      await handle(asDb(db), { bookingId: booking.id });
      expect(jobs.added).toEqual([]);
    });
  });
});
