import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  expectLedgerConsistent,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { handle } from "./payment.poll-charge";

const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);

describe("payment.poll-charge", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  it("confirms the Booking when the charge is paid", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      provider.fake.chargeState = {
        status: "paid",
        providerStatus: "CAPTURED",
        method: "benefit",
      };
      jobs.clear();
      await handle(
        asDb(db),
        { paymentId: payment.id, round: 0 },
        undefined,
        minutes(1),
      );

      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({
        status: "paid",
        method: "benefit",
        providerStatus: "CAPTURED",
        settledAt: minutes(1),
      });
      expect(
        await db.query.bookings.findFirst({
          where: eq(bookings.id, booking.id),
        }),
      ).toMatchObject({
        status: "confirmed",
        holdExpiresAt: null,
        paymentStatus: "paid",
      });
      expect(jobNames(jobs)).toEqual(["booking.confirmed"]);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("polls again at 90 s, then every 2 minutes, while the hold is live", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await chargedBooking(db, f);
      jobs.clear();
      await handle(
        asDb(db),
        { paymentId: payment.id, round: 0 },
        undefined,
        minutes(1),
      );
      await handle(
        asDb(db),
        { paymentId: payment.id, round: 1 },
        undefined,
        minutes(2),
      );
      expect(jobs.added.map((job) => [job.payload, job.runAt])).toEqual([
        [
          { paymentId: payment.id, round: 1 },
          new Date(minutes(1).getTime() + 90_000),
        ],
        [
          { paymentId: payment.id, round: 2 },
          new Date(minutes(2).getTime() + 120_000),
        ],
      ]);
    });
  });

  it("stops polling once the hold lapsed and when the charge failed", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      jobs.clear();
      await handle(
        asDb(db),
        { paymentId: payment.id, round: 4 },
        undefined,
        minutes(11),
      );
      expect(jobs.added).toEqual([]);

      provider.fake.chargeState = {
        status: "failed",
        providerStatus: "DECLINED",
        reason: "Declined",
      };
      await handle(
        asDb(db),
        { paymentId: payment.id, round: 4 },
        undefined,
        minutes(3),
      );
      expect(jobs.added).toEqual([]);
      expect(
        await db.query.bookingPayments.findFirst({
          where: eq(bookingPayments.id, payment.id),
        }),
      ).toMatchObject({ status: "failed", failureReason: "Declined" });
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("does nothing for a settled Payment", async () => {
    await withBookableVenue(async (db, f) => {
      const { payment } = await chargedBooking(db, f);
      await db
        .update(bookingPayments)
        .set({ status: "paid" })
        .where(eq(bookingPayments.id, payment.id));
      provider.fake.chargeState = new Error("must not be called");
      await expect(
        handle(asDb(db), { paymentId: payment.id, round: 0 }, undefined, NOW),
      ).resolves.toBeUndefined();
      expect(provider.fake.retrieveCalls).toEqual([]);
    });
  });
});
