import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { bookingPayments, bookings, paymentWebhookDeliveries } from "@repo/db";

import {
  NOW,
  asDb,
  chargedBooking,
  expectLedgerConsistent,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";
import { receivePaymentWebhook } from "#src/payments/receive-webhook";
import { confirmPayment } from "#src/routers/bookings/confirmPayment";

import { handle as pollCharge } from "./payment.poll-charge";
import { handle } from "./payment.process-webhook";

const minutes = (n: number) => new Date(NOW.getTime() + n * 60_000);
const paid = {
  status: "paid",
  providerStatus: "CAPTURED",
  method: "card",
} as const;

describe("payment.process-webhook", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  async function deliver(db: Parameters<typeof asDb>[0], reference: string) {
    provider.fake.webhookResult = {
      ok: true,
      deliveryKey: `${reference}:CAPTURED:1`,
      reference,
      state: paid,
    };
    const receipt = await receivePaymentWebhook(
      {
        provider: "tap",
        headers: new Headers({ hashstring: "x" }),
        body: "{}",
      },
      asDb(db),
    );
    const [delivery] = await db.select().from(paymentWebhookDeliveries);
    return { receipt, delivery };
  }

  it("applies a stored delivery once and marks it processed", async () => {
    await withBookableVenue(async (db, f) => {
      const { booking, payment } = await chargedBooking(db, f);
      const { delivery } = await deliver(db, payment.providerReference!);
      jobs.clear();

      await handle(
        asDb(db),
        { deliveryId: delivery!.id },
        undefined,
        minutes(1),
      );
      await handle(
        asDb(db),
        { deliveryId: delivery!.id },
        undefined,
        minutes(2),
      );

      expect(
        await db.query.bookings.findFirst({
          where: eq(bookings.id, booking.id),
        }),
      ).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
      expect(await db.query.paymentWebhookDeliveries.findFirst()).toMatchObject(
        { processedAt: minutes(1), error: null },
      );
      expect(
        jobs.added.filter((job) => job.name === "booking.confirmed"),
      ).toHaveLength(1);
      await expectLedgerConsistent(db, booking.id);
    });
  });

  it("retries when the Payment for the charge is not stored yet", async () => {
    await withBookableVenue(async (db) => {
      provider.fake.webhookResult = {
        ok: true,
        deliveryKey: "chg_unknown:CAPTURED:1",
        reference: "chg_unknown",
        state: paid,
      };
      await receivePaymentWebhook(
        { provider: "tap", headers: new Headers(), body: "{}" },
        asDb(db),
      );
      const [delivery] = await db.select().from(paymentWebhookDeliveries);
      await expect(
        handle(asDb(db), { deliveryId: delivery!.id }, undefined, NOW),
      ).rejects.toThrow("chg_unknown");
      expect(
        (await db.select().from(paymentWebhookDeliveries))[0]?.processedAt,
      ).toBeNull();
    });
  });

  it("confirms once however webhook, poll and confirmPayment are ordered", async () => {
    const orders = [
      ["webhook", "poll", "confirm"],
      ["confirm", "webhook", "poll"],
      ["poll", "confirm", "webhook"],
    ] as const;
    for (const order of orders) {
      await withBookableVenue(async (db, f) => {
        const { booking, payment } = await chargedBooking(db, f);
        const { delivery } = await deliver(db, payment.providerReference!);
        provider.fake.chargeState = paid;
        jobs.clear();

        const steps = {
          webhook: () =>
            handle(
              asDb(db),
              { deliveryId: delivery!.id },
              undefined,
              minutes(1),
            ),
          poll: () =>
            pollCharge(
              asDb(db),
              { paymentId: payment.id, round: 0 },
              undefined,
              minutes(1),
            ),
          confirm: () =>
            confirmPayment(db as never, {
              bookingId: booking.id,
              userId: f.customer,
              now: minutes(1),
            }).then(() => undefined),
        };
        for (const step of order) await steps[step]();

        expect(
          await db.query.bookings.findFirst({
            where: eq(bookings.id, booking.id),
          }),
        ).toMatchObject({ status: "confirmed", paymentStatus: "paid" });
        expect(
          await db
            .select()
            .from(bookingPayments)
            .where(eq(bookingPayments.status, "paid")),
        ).toHaveLength(1);
        expect(
          jobs.added.filter((job) => job.name === "booking.confirmed"),
        ).toHaveLength(1);
        await expectLedgerConsistent(db, booking.id);
      });
    }
  });
});
