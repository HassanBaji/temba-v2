import {
  ONLINE_PAYMENT_METHODS,
  type OnlinePaymentMethod,
} from "@repo/domain/booking-payment";

import { manualProvider } from "./manual";
import type { PaymentProvider } from "./provider";
import { createTapProvider } from "./tap";

let override: PaymentProvider | null = null;
let tapProvider: PaymentProvider | null = null;

function tapFromEnv(): PaymentProvider {
  const secretKey = process.env.TAP_SECRET_KEY;
  const publicUrl = process.env.API_PUBLIC_URL;
  if (!secretKey || !publicUrl) {
    throw new Error(
      "PAYMENT_PROVIDER=tap needs TAP_SECRET_KEY and API_PUBLIC_URL",
    );
  }
  return createTapProvider({
    secretKey,
    webhookUrl: `${publicUrl}/webhooks/payments/tap`,
  });
}

export function setPaymentProvider(provider: PaymentProvider): void {
  override = provider;
}

export function resetPaymentProvider(): void {
  override = null;
  tapProvider = null;
}

export function paymentProvider(): PaymentProvider {
  if (override) {
    return override;
  }
  const chosen = process.env.PAYMENT_PROVIDER ?? "manual";
  if (chosen === "manual") {
    return manualProvider;
  }
  if (chosen === "tap") {
    tapProvider ??= tapFromEnv();
    return tapProvider;
  }
  throw new Error(`PAYMENT_PROVIDER "${chosen}" has no adapter`);
}

const DEFAULT_TAP_METHODS: OnlinePaymentMethod[] = [
  "card",
  "benefit",
  "benefitpay",
];

/**
 * The online methods offered at checkout, in order. Tap enables methods per
 * merchant account and has no call to list them, so `TAP_PAYMENT_METHODS`
 * names the ones switched on (comma separated). Apple Pay is left out by
 * default because Tap needs the domain verified for it first.
 */
export function onlinePaymentMethods(): OnlinePaymentMethod[] {
  const listed = process.env.TAP_PAYMENT_METHODS?.split(",")
    .map((entry) => entry.trim())
    .filter((entry): entry is OnlinePaymentMethod =>
      (ONLINE_PAYMENT_METHODS as readonly string[]).includes(entry),
    );
  return listed && listed.length > 0
    ? [...new Set(listed)]
    : DEFAULT_TAP_METHODS;
}
