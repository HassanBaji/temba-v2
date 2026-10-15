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
