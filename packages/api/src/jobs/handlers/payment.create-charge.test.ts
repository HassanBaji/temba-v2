import { eq } from "drizzle-orm";
import type { JobHelpers } from "graphile-worker";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings } from "@repo/db";

import {
  NOW,
  asDb,
  createHeldBooking,
  expectLedgerConsistent,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { setPaymentProvider } from "#src/payments/index";
import { manualProvider } from "#src/payments/manual";
import { getPaymentState } from "#src/routers/bookings/paymentState";

import { handle } from "./payment.create-charge";

describe("payment.create-charge", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  it("stores the reference and redirect url and queues the first poll", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      const [payment] = await db.select().from(bookingPayments);
      const state = () =>
        getPaymentState(db, {
          bookingId: booking.id,
          userId: f.customer,
          now: NOW,
        });
      expect(await state()).toMatchObject({ kind: "preparing" });

      jobs.clear();
      await handle(asDb(db), { paymentId: payment!.id }, undefined, NOW);

      const stored = await db.query.bookingPayments.findFirst({
        where: eq(bookingPayments.id, payment!.id),
      });
      expect(stored).toMatchObject({
        providerReference: `chg_${payment!.id}`,
        clientRedirectUrl: `https://pay.example/${payment!.id}`,
        providerStatus: "INITIATED",
        status: "pending",
      });
      expect(await state()).toMatchObject({
        kind: "redirect",
        redirectUrl: `https://pay.example/${payment!.id}`,
      });
      expect(jobNames(jobs)).toEqual(["payment.poll-charge"]);
      expect(jobs.added[0]?.runAt).toEqual(new Date(NOW.getTime() + 45_000));
      expect(jobs.added[0]?.payload).toEqual({
        paymentId: payment!.id,
        round: 0,
      });
    });
  });

  it("asks the provider for the method the Customer picked", async () => {
    await withBookableVenue(async (db, f) => {
      await createHeldBooking(db, f, { paymentMethod: "benefit" });
      const [payment] = await db.select().from(bookingPayments);
      await handle(asDb(db), { paymentId: payment!.id }, undefined, NOW);
      expect(provider.fake.beginCalls[0]?.method).toBe("benefit");
    });
  });

  it("creates one charge when run twice for one Payment", async () => {
    await withBookableVenue(async (db, f) => {
      await createHeldBooking(db, f);
      const [payment] = await db.select().from(bookingPayments);
      await handle(asDb(db), { paymentId: payment!.id }, undefined, NOW);
      await handle(asDb(db), { paymentId: payment!.id }, undefined, NOW);
      expect(provider.fake.beginCalls).toHaveLength(1);
    });
  });

  it("marks the Payment failed on a definitive provider failure and keeps the hold", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking } = await createHeldBooking(db, f);
      const [payment] = await db.select().from(bookingPayments);
      provider.fake.beginResult = {
        kind: "failed",
        reason: "Card not supported",
      };
      await handle(asDb(db), { paymentId: payment!.id }, undefined, NOW);

      const stored = await db.query.bookingPayments.findFirst();
      expect(stored).toMatchObject({
        status: "failed",
        failureReason: "Card not supported",
      });
      const row = await db.query.bookings.findFirst({
        where: eq(bookings.id, booking.id),
      });
      expect(row).toMatchObject({
        status: "pending_payment",
        paymentStatus: "failed",
      });
      expect(
        await getPaymentState(db, {
          bookingId: booking.id,
          userId: f.customer,
          now: NOW,
        }),
      ).toMatchObject({ kind: "failed", reason: "Card not supported" });
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("throws when this worker uses a different provider than the Payment", async () => {
    await withBookableVenue(async (db, f) => {
      await createHeldBooking(db, f);
      const [payment] = await db.select().from(bookingPayments);
      setPaymentProvider(manualProvider);

      await expect(
        handle(asDb(db), { paymentId: payment!.id }, undefined, NOW),
      ).rejects.toThrow("is for tap but this worker uses manual");
      expect(await db.query.bookingPayments.findFirst()).toMatchObject({
        status: "pending",
        providerReference: null,
      });
    });
  });

  it("throws on a network error and leaves the Payment pending until the last attempt", async () => {
    await withBookableVenue(async (db, f) => {
      await createHeldBooking(db, f);
      const [payment] = await db.select().from(bookingPayments);
      provider.fake.beginResult = new Error("socket hang up");

      const attempt = (attempts: number) =>
        handle(
          asDb(db),
          { paymentId: payment!.id },
          { job: { attempts, max_attempts: 5 } } as unknown as JobHelpers,
          NOW,
        );
      await expect(attempt(2)).rejects.toThrow("socket hang up");
      expect((await db.query.bookingPayments.findFirst())?.status).toBe(
        "pending",
      );

      await expect(attempt(5)).rejects.toThrow("socket hang up");
      expect(await db.query.bookingPayments.findFirst()).toMatchObject({
        status: "failed",
        failureReason: "Payment could not be started",
      });
    });
  });
});
