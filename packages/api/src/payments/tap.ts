import { createHmac, timingSafeEqual } from "node:crypto";

import type { OnlinePaymentMethod } from "@repo/domain/booking-payment";

import type {
  ChargeState,
  PaymentProvider,
  RefundResult,
  WebhookVerification,
} from "./provider";

const TAP_API = "https://api.tap.company/v2";
const CURRENCY = "BHD";
const REFUND_PAGE_LIMIT = 50;
const REFUND_MAX_PAGES = 10;

/** Tap's hosted-page source for each method; no method shows every enabled one. */
export const TAP_SOURCES: Record<OnlinePaymentMethod, string> = {
  card: "src_card",
  benefit: "src_bh.benefit",
  benefitpay: "src_benefitpay",
  apple_pay: "src_apple_pay",
};
const ALL_SOURCES = "src_all";

type Transport = (url: string, init: RequestInit) => Promise<Response>;

export type TapConfig = {
  secretKey: string;
  webhookUrl: string;
  fetch?: Transport;
};

type TapCharge = {
  id?: string;
  amount?: number | string;
  currency?: string;
  status?: string;
  response?: { message?: string };
  source?: { id?: string; payment_method?: string; payment_type?: string };
  transaction?: { url?: string; created?: string | number };
  reference?: { gateway?: string; payment?: string };
};

type TapRefund = {
  id?: string;
  status?: string;
  response?: { message?: string };
  metadata?: { idempotencyKey?: string };
};

const PAID = new Set(["CAPTURED"]);
const FAILED = new Set([
  "FAILED",
  "DECLINED",
  "RESTRICTED",
  "ABANDONED",
  "CANCELLED",
  "TIMEDOUT",
  "UNKNOWN",
  "VOID",
]);
const REFUND_REJECTED = new Set(["FAILED", "DECLINED", "RESTRICTED", "ERROR"]);

export function filsToTapAmount(fils: number): number {
  return Number((fils / 1000).toFixed(3));
}

function amountText(amount: number | string | undefined): string {
  return Number(amount ?? 0).toFixed(3);
}

function chargeState(charge: TapCharge): ChargeState {
  const providerStatus = charge.status ?? "UNKNOWN";
  const status = PAID.has(providerStatus)
    ? "paid"
    : FAILED.has(providerStatus)
      ? "failed"
      : "pending";
  return {
    status,
    providerStatus,
    method: status === "paid" ? paidMethod(charge) : undefined,
    reason: status === "failed" ? charge.response?.message : undefined,
  };
}

function paidMethod(charge: TapCharge): OnlinePaymentMethod {
  const bySource = Object.entries(TAP_SOURCES).find(
    ([, source]) => source === charge.source?.id,
  );
  if (bySource) {
    return bySource[0] as OnlinePaymentMethod;
  }
  const described = `${charge.source?.payment_method ?? ""} ${
    charge.source?.payment_type ?? ""
  }`.toUpperCase();
  if (described.includes("BENEFITPAY")) {
    return "benefitpay";
  }
  if (described.includes("BENEFIT")) {
    return "benefit";
  }
  if (described.includes("APPLE")) {
    return "apple_pay";
  }
  return "card";
}

export function tapHashstring(charge: TapCharge, secretKey: string): string {
  const payload =
    `x_id${charge.id ?? ""}` +
    `x_amount${amountText(charge.amount)}` +
    `x_currency${charge.currency ?? ""}` +
    `x_gateway_reference${charge.reference?.gateway ?? ""}` +
    `x_payment_reference${charge.reference?.payment ?? ""}` +
    `x_status${charge.status ?? ""}` +
    `x_created${charge.transaction?.created ?? ""}`;
  return createHmac("sha256", secretKey).update(payload).digest("hex");
}

function signaturesMatch(expected: string, received: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createTapProvider(config: TapConfig): PaymentProvider {
  const send: Transport = config.fetch ?? ((url, init) => fetch(url, init));

  async function call<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
  ): Promise<{ ok: boolean; status: number; json: T }> {
    const response = await send(`${TAP_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as T;
    return { ok: response.ok, status: response.status, json };
  }

  async function findRefund(
    chargeId: string,
    idempotencyKey: string,
  ): Promise<TapRefund | undefined> {
    let startingAfter: string | undefined;
    for (let page = 0; page < REFUND_MAX_PAGES; page++) {
      const listed = await call<{ refunds?: TapRefund[]; has_more?: boolean }>(
        "POST",
        "/refunds/list",
        {
          charges: [chargeId],
          limit: REFUND_PAGE_LIMIT,
          ...(startingAfter ? { starting_after: startingAfter } : {}),
        },
      );
      if (!listed.ok) {
        throw new Error(`Tap refund list failed with ${listed.status}`);
      }
      const refunds = listed.json.refunds ?? [];
      const match = refunds.find(
        (refund) => refund.metadata?.idempotencyKey === idempotencyKey,
      );
      if (match) {
        return match;
      }
      const last = refunds[refunds.length - 1];
      if (!listed.json.has_more || !last?.id) {
        return undefined;
      }
      startingAfter = last.id;
    }
    return undefined;
  }

  return {
    id: "tap",

    async begin(args) {
      const created = await call<TapCharge>("POST", "/charges", {
        amount: filsToTapAmount(args.amountFils),
        currency: CURRENCY,
        customer: {
          first_name: args.customer.name,
          ...(args.customer.email ? { email: args.customer.email } : {}),
        },
        source: { id: args.method ? TAP_SOURCES[args.method] : ALL_SOURCES },
        redirect: { url: args.returnUrl },
        post: { url: config.webhookUrl },
        reference: { transaction: args.paymentId, order: args.bookingId },
        metadata: { paymentId: args.paymentId, bookingId: args.bookingId },
      });
      if (!created.ok) {
        if (created.status >= 500) {
          throw new Error(`Tap create charge failed with ${created.status}`);
        }
        return { kind: "failed", reason: "Payment could not be started" };
      }
      const redirectUrl = created.json.transaction?.url;
      if (!created.json.id || !redirectUrl) {
        throw new Error("Tap charge response has no id or transaction url");
      }
      return { kind: "redirect", reference: created.json.id, redirectUrl };
    },

    async retrieve({ reference }) {
      const retrieved = await call<TapCharge>(
        "GET",
        `/charges/${encodeURIComponent(reference)}`,
      );
      if (!retrieved.ok) {
        throw new Error(`Tap retrieve charge failed with ${retrieved.status}`);
      }
      return chargeState(retrieved.json);
    },

    async refund({ reference, amountFils, idempotencyKey }) {
      let existing: TapRefund | undefined;
      try {
        existing = await findRefund(reference, idempotencyKey);
      } catch (error) {
        return {
          failed:
            error instanceof Error ? error.message : "Refund lookup failed",
          retryable: true,
        };
      }
      const outcome = (refund: TapRefund): RefundResult =>
        REFUND_REJECTED.has(refund.status ?? "")
          ? {
              failed: refund.response?.message ?? "Refund rejected",
              retryable: false,
            }
          : { reference: refund.id ?? "" };
      if (existing) {
        return outcome(existing);
      }

      let created;
      try {
        created = await call<TapRefund>("POST", "/refunds", {
          charge_id: reference,
          amount: filsToTapAmount(amountFils),
          currency: CURRENCY,
          reason: "requested_by_customer",
          reference: { merchant: idempotencyKey },
          metadata: { idempotencyKey },
        });
      } catch (error) {
        return {
          failed: error instanceof Error ? error.message : "Refund failed",
          retryable: true,
        };
      }
      if (!created.ok) {
        return {
          failed:
            created.json.response?.message ??
            `Tap refund failed with ${created.status}`,
          retryable: created.status >= 500 || created.status === 429,
        };
      }
      if (!created.json.id) {
        return { failed: "Tap refund response has no id", retryable: true };
      }
      return outcome(created.json);
    },

    verifyWebhook(raw): Promise<WebhookVerification> {
      const received = raw.headers.get("hashstring");
      if (!received) {
        return Promise.resolve({ ok: false, reason: "Missing hashstring" });
      }
      let charge: TapCharge;
      try {
        charge = JSON.parse(raw.body) as TapCharge;
      } catch {
        return Promise.resolve({ ok: false, reason: "Body is not JSON" });
      }
      if (!charge.id || !charge.status) {
        return Promise.resolve({ ok: false, reason: "Not a charge" });
      }
      if (!signaturesMatch(tapHashstring(charge, config.secretKey), received)) {
        return Promise.resolve({ ok: false, reason: "Signature mismatch" });
      }
      return Promise.resolve({
        ok: true,
        deliveryKey: `${charge.id}:${charge.status}:${charge.transaction?.created ?? ""}`,
        reference: charge.id,
        state: chargeState(charge),
      });
    },
  };
}
