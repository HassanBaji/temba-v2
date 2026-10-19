import { describe, expect, it } from "vitest";

import { paymentWebhookDeliveries } from "@repo/db";

import {
  asDb,
  jobNames,
  recordJobs,
  useFakeProvider,
  withBookableVenue,
} from "#src/bookings/booking.test-support";

import { receivePaymentWebhook } from "./receive-webhook";

const raw = { provider: "tap", headers: new Headers({ a: "b" }), body: "{}" };

describe("receivePaymentWebhook", () => {
  const jobs = recordJobs();
  const provider = useFakeProvider();

  const good = {
    ok: true as const,
    deliveryKey: "chg_1:CAPTURED:7",
    reference: "chg_1",
    state: { status: "paid" as const, providerStatus: "CAPTURED" },
  };

  it("stores the delivery and queues one processing job", async () => {
    await withBookableVenue(async (db) => {
      provider.fake.webhookResult = good;
      expect(await receivePaymentWebhook(raw, asDb(db))).toEqual({
        status: 200,
      });
      const rows = await db.select().from(paymentWebhookDeliveries);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        provider: "tap",
        deliveryKey: "chg_1:CAPTURED:7",
        reference: "chg_1",
        body: "{}",
        headers: { a: "b" },
        processedAt: null,
      });
      expect(jobNames(jobs)).toEqual(["payment.process-webhook"]);
      expect(jobs.added[0]).toMatchObject({
        key: "payment:webhook:chg_1:CAPTURED:7",
        payload: { deliveryId: rows[0]!.id },
      });
    });
  });

  it("answers 200 and creates nothing for a replayed delivery key", async () => {
    await withBookableVenue(async (db) => {
      provider.fake.webhookResult = good;
      await receivePaymentWebhook(raw, asDb(db));
      jobs.clear();
      expect(await receivePaymentWebhook(raw, asDb(db))).toEqual({
        status: 200,
      });
      expect(await db.select().from(paymentWebhookDeliveries)).toHaveLength(1);
      expect(jobs.added).toEqual([]);
    });
  });

  it("answers 400 and stores nothing for a bad signature or another provider", async () => {
    await withBookableVenue(async (db) => {
      provider.fake.webhookResult = { ok: false, reason: "Bad signature" };
      expect(await receivePaymentWebhook(raw, asDb(db))).toEqual({
        status: 400,
        reason: "Bad signature",
      });
      expect(
        await receivePaymentWebhook({ ...raw, provider: "other" }, asDb(db)),
      ).toMatchObject({
        status: 400,
      });
      expect(await db.select().from(paymentWebhookDeliveries)).toEqual([]);
      expect(jobs.added).toEqual([]);
    });
  });
});
