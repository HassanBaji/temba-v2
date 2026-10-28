import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bookingPayments, bookings, paymentWebhookDeliveries } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  createHeldBooking,
  insertPayment,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { handle, payloadSchema } from "./booking.reconcile";

const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const days = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

describe("booking.reconcile", () => {
  const jobs = recordJobs();
  useFakeProvider();

  afterEach(() => vi.restoreAllMocks());

  const run = (db: Parameters<typeof asDb>[0], now: Date) => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    return handle(asDb(db), payloadSchema.parse({}), undefined, now);
  };

  it("is a no-op on an empty database", async () => {
    await withBookableVenue(async (db) => {
      await expect(run(db, NOW)).resolves.toBeUndefined();
      expect(jobs.added).toEqual([]);
    });
  });

  it("expires a hold that lapsed over two minutes ago but not a fresher one", async () => {
    await withBookableVenue(async (db, f) => {
      const stale = await createHeldBooking(db, f);
      const fresh = await createHeldBooking(db, f, { hour: 20 });

      await run(db, minutes(11));
      expect(
        (
          await db.query.bookings.findFirst({
            where: eq(bookings.id, fresh.booking.id),
          })
        )?.status,
      ).toBe("pending_payment");
      await run(db, minutes(13));
      for (const { booking } of [stale, fresh]) {
        expect(
          (
            await db.query.bookings.findFirst({
              where: eq(bookings.id, booking.id),
            })
          )?.status,
        ).toBe("expired");
      }
    });
  });

  it("re-polls a pending charge whose Booking is past its hold", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      jobs.clear();
      await run(db, minutes(5));
      expect(jobs.added).toEqual([]);

      await run(db, minutes(30));
      expect(
        (
          await db.query.bookings.findFirst({
            where: eq(bookings.id, booking.id),
          })
        )?.status,
      ).toBe("expired");
      expect(jobs.added.map((job) => [job.name, job.payload])).toEqual([
        ["payment.poll-charge", { paymentId: payment.id, round: 0 }],
      ]);
      expect(
        (
          await db.query.bookingPayments.findFirst({
            where: eq(bookingPayments.id, payment.id),
          })
        )?.status,
      ).toBe("pending");
    });
  });

  it("prunes deliveries older than 90 days", async () => {
    await withBookableVenue(async (db) => {
      await db.insert(paymentWebhookDeliveries).values([
        {
          provider: "tap",
          deliveryKey: "old",
          reference: "c",
          body: "",
          headers: {},
          receivedAt: days(-91),
        },
        {
          provider: "tap",
          deliveryKey: "new",
          reference: "c",
          body: "",
          headers: {},
          receivedAt: days(-89),
        },
      ]);
      await run(db, NOW);
      expect(
        (await db.select().from(paymentWebhookDeliveries)).map(
          (d) => d.deliveryKey,
        ),
      ).toEqual(["new"]);
    });
  });

  it("does not re-poll manual Payments", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      await db
        .update(bookings)
        .set({ status: "expired", holdExpiresAt: null })
        .where(eq(bookings.id, booking.id));
      await insertPayment(db, booking.id, { providerReference: "note" });
      jobs.clear();
      await run(db, minutes(30));
      expect(jobs.added).toEqual([]);
    });
  });
});
