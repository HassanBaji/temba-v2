import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { paymentProvider, resetPaymentProvider } from "./index";
import { createTapProvider, tapHashstring } from "./tap";

const SECRET = "sk_test_secret";
const WEBHOOK_URL = "https://api.example/webhooks/payments/tap";

function fixture(name: string) {
  return readFileSync(join(__dirname, "__fixtures__/tap", name), "utf8");
}

type Call = { url: string; method: string; body: unknown };

function fakeTransport(responses: { status?: number; body: string }[]) {
  const calls: Call[] = [];
  const queue = [...responses];
  const fetch = (url: string, init: RequestInit) => {
    calls.push({
      url,
      method: init.method ?? "GET",
      body: init.body ? JSON.parse(init.body as string) : undefined,
    });
    const next = queue.shift();
    if (!next) {
      return Promise.reject(new Error("Unexpected request"));
    }
    return Promise.resolve(
      new Response(next.body, {
        status: next.status ?? 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  };
  return { calls, fetch };
}

function provider(responses: { status?: number; body: string }[]) {
  const transport = fakeTransport(responses);
  return {
    calls: transport.calls,
    tap: createTapProvider({
      secretKey: SECRET,
      webhookUrl: WEBHOOK_URL,
      fetch: transport.fetch,
    }),
  };
}

const customer = { userId: "u1", name: "Aisha", email: "a@example.com" };

describe("tap begin", () => {
  it("sends BHD three-decimal amounts and stores the charge id and url", async () => {
    const { tap, calls } = provider([
      { body: fixture("charge-initiated.json") },
    ]);
    const begun = await tap.begin({
      paymentId: "pay_1",
      bookingId: "b1",
      amountFils: 12_500,
      customer,
      returnUrl: "https://api.example/payments/return?bookingId=b1",
    });

    expect(begun).toEqual({
      kind: "redirect",
      reference: "chg_TS02A5320262230Q2D81012822",
      redirectUrl:
        "https://checkout.tap.company/?mode=page&charge_id=chg_TS02A5320262230Q2D81012822",
    });
    expect(calls[0]).toMatchObject({
      url: "https://api.tap.company/v2/charges",
      method: "POST",
    });
    const body = calls[0]?.body as Record<string, unknown>;
    expect(JSON.stringify(body)).toContain('"amount":12.5');
    expect(body).toMatchObject({
      currency: "BHD",
      source: { id: "src_all" },
      redirect: { url: "https://api.example/payments/return?bookingId=b1" },
      post: { url: WEBHOOK_URL },
      metadata: { paymentId: "pay_1" },
    });
  });

  it("returns failed on a rejected request and throws on a server error", async () => {
    const rejected = provider([{ status: 400, body: "{}" }]);
    await expect(
      rejected.tap.begin({
        paymentId: "p",
        bookingId: "b",
        amountFils: 1000,
        customer,
        returnUrl: "x",
      }),
    ).resolves.toMatchObject({ kind: "failed" });

    const down = provider([{ status: 503, body: "{}" }]);
    await expect(
      down.tap.begin({
        paymentId: "p",
        bookingId: "b",
        amountFils: 1000,
        customer,
        returnUrl: "x",
      }),
    ).rejects.toThrow();
  });
});

describe("tap retrieve", () => {
  it.each([
    ["charge-captured.json", "paid", "card"],
    ["charge-captured-benefit.json", "paid", "benefit"],
    ["charge-declined.json", "failed", undefined],
    ["charge-failed.json", "failed", undefined],
    ["charge-abandoned.json", "failed", undefined],
    ["charge-cancelled.json", "failed", undefined],
    ["charge-timedout.json", "failed", undefined],
    ["charge-restricted.json", "failed", undefined],
    ["charge-unknown.json", "failed", undefined],
    ["charge-initiated.json", "pending", undefined],
    ["charge-in-progress.json", "pending", undefined],
  ])("maps %s to %s", async (file, status, method) => {
    const { tap, calls } = provider([{ body: fixture(file) }]);
    const state = await tap.retrieve({ reference: "chg_1" });
    expect(state.status).toBe(status);
    expect(state.method).toBe(method);
    expect(calls[0]).toMatchObject({
      url: "https://api.tap.company/v2/charges/chg_1",
      method: "GET",
    });
  });

  it("carries the decline reason", async () => {
    const { tap } = provider([{ body: fixture("charge-declined.json") }]);
    const state = await tap.retrieve({ reference: "chg_1" });
    expect(state.reason).toBe("Declined, Do not honor");
    expect(state.providerStatus).toBe("DECLINED");
  });
});

describe("tap verifyWebhook", () => {
  function signed(body: string) {
    const hashstring = tapHashstring(JSON.parse(body), SECRET);
    return { body, headers: new Headers({ hashstring }) };
  }

  it("computes the documented hashstring", () => {
    const charge = JSON.parse(fixture("charge-captured.json"));
    const expected = createHmac("sha256", SECRET)
      .update(
        "x_idchg_TS02A5320262230Q2D81012822x_amount12.500x_currencyBHDx_gateway_referencegw_123x_payment_referencepmt_456x_statusCAPTURED" +
          "x_created1790000000000",
      )
      .digest("hex");
    expect(tapHashstring(charge, SECRET)).toBe(expected);
  });

  it("accepts the signed delivery with a stable delivery key", async () => {
    const { tap } = provider([]);
    const delivery = signed(fixture("charge-captured.json"));
    const first = await tap.verifyWebhook(delivery);
    const second = await tap.verifyWebhook(delivery);
    expect(first).toMatchObject({
      ok: true,
      reference: "chg_TS02A5320262230Q2D81012822",
      state: { status: "paid", method: "card" },
    });
    expect(first).toEqual(second);
    if (first.ok) {
      expect(first.deliveryKey).toBe(
        "chg_TS02A5320262230Q2D81012822:CAPTURED:1790000000000",
      );
    }
  });

  it("rejects a tampered body", async () => {
    const { tap } = provider([]);
    const delivery = signed(fixture("charge-declined.json"));
    const tampered = delivery.body.replace("DECLINED", "CAPTURED");
    await expect(
      tap.verifyWebhook({ headers: delivery.headers, body: tampered }),
    ).resolves.toEqual({ ok: false, reason: "Signature mismatch" });
  });

  it("rejects an unknown signature, a missing one and a non-charge body", async () => {
    const { tap } = provider([]);
    const body = fixture("charge-captured.json");
    await expect(
      tap.verifyWebhook({
        headers: new Headers({ hashstring: "deadbeef" }),
        body,
      }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      tap.verifyWebhook({ headers: new Headers(), body }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      tap.verifyWebhook({
        headers: new Headers({ hashstring: "x" }),
        body: "not json",
      }),
    ).resolves.toMatchObject({ ok: false });
  });
});

describe("tap refund", () => {
  it("returns the existing refund for a key already on the charge", async () => {
    const { tap, calls } = provider([{ body: fixture("refund-list.json") }]);
    const result = await tap.refund({
      reference: "chg_1",
      amountFils: 4250,
      idempotencyKey: "refund-key-existing",
    });
    expect(result).toEqual({ reference: "re_existing" });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: "https://api.tap.company/v2/refunds/list",
      body: { charges: ["chg_1"] },
    });
  });

  it("creates a refund when the key is new", async () => {
    const { tap, calls } = provider([
      { body: fixture("refund-list-empty.json") },
      { body: fixture("refund-created.json") },
    ]);
    const result = await tap.refund({
      reference: "chg_1",
      amountFils: 4250,
      idempotencyKey: "refund-key-new",
    });
    expect(result).toEqual({ reference: "re_TS01A5320262230Q2D81012822" });
    expect(calls[1]).toMatchObject({
      url: "https://api.tap.company/v2/refunds",
      method: "POST",
      body: {
        charge_id: "chg_1",
        currency: "BHD",
        metadata: { idempotencyKey: "refund-key-new" },
      },
    });
    expect(JSON.stringify(calls[1]?.body)).toContain('"amount":4.25');
  });

  it("marks a rejected refund permanent and a server error retryable", async () => {
    const rejected = provider([
      { body: fixture("refund-list-empty.json") },
      { status: 400, body: '{"response":{"message":"Charge not captured"}}' },
    ]);
    await expect(
      rejected.tap.refund({
        reference: "chg_1",
        amountFils: 1000,
        idempotencyKey: "k",
      }),
    ).resolves.toEqual({ failed: "Charge not captured", retryable: false });

    const down = provider([
      { body: fixture("refund-list-empty.json") },
      { status: 502, body: "{}" },
    ]);
    await expect(
      down.tap.refund({
        reference: "chg_1",
        amountFils: 1000,
        idempotencyKey: "k",
      }),
    ).resolves.toMatchObject({ retryable: true });
  });
});

describe("paymentProvider selection", () => {
  afterEach(() => {
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.TAP_SECRET_KEY;
    delete process.env.API_PUBLIC_URL;
    resetPaymentProvider();
  });

  it("selects tap for PAYMENT_PROVIDER=tap and manual by default", () => {
    expect(paymentProvider().id).toBe("manual");
    process.env.PAYMENT_PROVIDER = "tap";
    process.env.TAP_SECRET_KEY = SECRET;
    process.env.API_PUBLIC_URL = "https://api.example";
    expect(paymentProvider().id).toBe("tap");
  });
});
