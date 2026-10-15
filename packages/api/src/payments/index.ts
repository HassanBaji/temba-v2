import { manualProvider } from "./manual";
import type { PaymentProvider } from "./provider";

let override: PaymentProvider | null = null;

export function setPaymentProvider(provider: PaymentProvider): void {
  override = provider;
}

export function resetPaymentProvider(): void {
  override = null;
}

export function paymentProvider(): PaymentProvider {
  if (override) {
    return override;
  }
  const chosen = process.env.PAYMENT_PROVIDER ?? "manual";
  if (chosen === "manual") {
    return manualProvider;
  }
  throw new Error(`PAYMENT_PROVIDER "${chosen}" has no adapter`);
}
