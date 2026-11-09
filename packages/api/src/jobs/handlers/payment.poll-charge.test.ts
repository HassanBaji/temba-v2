import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  expectLedgerConsistent,
  insertBooking,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import type { ChargeState } from "#src/payments/provider";

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

  describe("late and mismatched captures", () => {
    afterEach(() => vi.restoreAllMocks());

    const captured = (patch: Partial<ChargeState> = {}): ChargeState => ({
      status: "paid",
      providerStatus: "CAPTURED",
      method: "card",
      charged: { amountFils: 10_000, currency: "BHD" },
      ...patch,
    });

    const poll = (
      db: Parameters<typeof asDb>[0],
      paymentId: string,
      at: Date,
    ) => handle(asDb(db), { paymentId, round: 0 }, undefined, at);

    const paymentRow = (db: Parameters<typeof asDb>[0], id: string) =>
      db.query.bookingPayments.findFirst({ where: eq(bookingPayments.id, id) });
    const bookingRow = (db: Parameters<typeof asDb>[0], id: string) =>
      db.query.bookings.findFirst({ where: eq(bookings.id, id) });

    it("keeps polling an UNKNOWN charge and confirms when it is captured", async () => {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        provider.fake.chargeState = {
          status: "pending",
          providerStatus: "UNKNOWN",
        };
        jobs.clear();
        await poll(db, payment.id, minutes(1));
        expect(await paymentRow(db, payment.id)).toMatchObject({
          status: "pending",
          providerStatus: "UNKNOWN",
        });
        expect(jobNames(jobs)).toEqual(["payment.poll-charge"]);

        provider.fake.chargeState = captured();
        await poll(db, payment.id, minutes(3));
        expect(await bookingRow(db, booking.id)).toMatchObject({
          status: "confirmed",
          paymentStatus: "paid",
        });
      });
    });

    it("confirms a capture on a failed Payment while the hold is live and it is the latest attempt", async () => {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        provider.fake.chargeState = {
          status: "failed",
          providerStatus: "DECLINED",
        };
        await poll(db, payment.id, minutes(1));
        expect((await paymentRow(db, payment.id))?.status).toBe("failed");

        provider.fake.chargeState = captured();
        jobs.clear();
        await poll(db, payment.id, minutes(2));
        expect(await paymentRow(db, payment.id)).toMatchObject({
          status: "paid",
        });
        expect(await bookingRow(db, booking.id)).toMatchObject({
          status: "confirmed",
          paymentStatus: "paid",
        });
        expect(jobNames(jobs)).toEqual(["booking.confirmed"]);
        await expectLedgerConsistent(db, booking.id);
      });
    });

    it("records and refunds a capture on a failed Payment whose Booking expired", async () => {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        provider.fake.chargeState = {
          status: "failed",
          providerStatus: "DECLINED",
        };
        await poll(db, payment.id, minutes(1));
        await db
          .update(bookings)
          .set({ status: "expired", holdExpiresAt: null })
          .where(eq(bookings.id, booking.id));

        provider.fake.chargeState = captured();
        jobs.clear();
        await poll(db, payment.id, minutes(40));
        expect(await paymentRow(db, payment.id)).toMatchObject({
          status: "paid",
          settledAt: minutes(40),
        });
        expect((await bookingRow(db, booking.id))?.status).toBe("expired");
        expect(jobs.added.map((job) => [job.name, job.payload])).toEqual([
          [
            "payment.refund",
            {
              paymentId: payment.id,
              amountFils: payment.amountFils,
              reason: "captured_after_failure",
              refundKey: `expired-after-capture:${payment.id}`,
            },
          ],
        ]);
        await expectLedgerConsistent(db, booking.id);
      });
    });

    it("confirms a capture taken inside the hold when the job runs after it, if the Court is still free", async () => {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        provider.fake.chargeState = captured({ capturedAt: minutes(9) });
        jobs.clear();
        await poll(db, payment.id, minutes(12));
        expect(await bookingRow(db, booking.id)).toMatchObject({
          status: "confirmed",
          paymentStatus: "paid",
        });
        expect(jobNames(jobs)).toEqual(["booking.confirmed"]);
      });
    });

    it("refunds a capture taken inside the hold when someone booked the Court since", async () => {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        await insertBooking(db, f, { userId: f.other });
        provider.fake.chargeState = captured({ capturedAt: minutes(9) });
        jobs.clear();
        await poll(db, payment.id, minutes(12));
        expect((await bookingRow(db, booking.id))?.status).toBe("expired");
        expect(jobNames(jobs)).toEqual(["payment.refund"]);
      });
    });

    it("refunds a capture taken after the hold", async () => {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        provider.fake.chargeState = captured({ capturedAt: minutes(11) });
        jobs.clear();
        await poll(db, payment.id, minutes(12));
        expect((await bookingRow(db, booking.id))?.status).toBe("expired");
        expect(jobNames(jobs)).toEqual(["payment.refund"]);
      });
    });

    it.each([
      ["amount", { amountFils: 9_000, currency: "BHD" }],
      ["currency", { amountFils: 10_000, currency: "USD" }],
      ["unreadable amount", { amountFils: Number.NaN, currency: "BHD" }],
    ])(
      "leaves a capture with the wrong %s pending for review",
      async (_label, charged) => {
        await withBookableVenue(async (db, f) => {
          const errors = vi
            .spyOn(console, "error")
            .mockImplementation(() => {});
          const { booking, payment } = await chargedBooking(db, f);
          provider.fake.chargeState = captured({ charged });
          jobs.clear();
          await poll(db, payment.id, minutes(1));
          expect(await paymentRow(db, payment.id)).toMatchObject({
            status: "pending",
            providerStatus: "AMOUNT_MISMATCH",
          });
          expect((await bookingRow(db, booking.id))?.status).toBe(
            "pending_payment",
          );
          expect(jobs.added.map((job) => job.name)).not.toContain(
            "payment.refund",
          );
          expect(JSON.parse(String(errors.mock.calls[0]?.[0]))).toMatchObject({
            event: "payment_charge_mismatch",
            paymentId: payment.id,
            expectedFils: 10_000,
          });
        });
      },
    );
  });
});
