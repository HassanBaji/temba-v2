import type { PaymentProvider } from "./provider";

export const manualProvider: PaymentProvider = {
  id: "manual",
  begin: () => Promise.resolve({ kind: "deferred" }),
  retrieve: () =>
    Promise.reject(new Error("The manual provider has no charges to retrieve")),
  refund: () => Promise.resolve({ reference: "manual" }),
  verifyWebhook: () =>
    Promise.resolve({
      ok: false,
      reason: "The manual provider has no webhook",
    }),
};
