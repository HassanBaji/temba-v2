export type PaymentBegin =
  | { kind: "deferred" }
  | { kind: "redirect"; reference: string; redirectUrl: string }
  | { kind: "failed"; reason: string };

export type ChargeState = {
  status: "pending" | "paid" | "failed";
  providerStatus: string;
  method?: "card" | "benefit";
  reason?: string;
};

export type RefundResult =
  | { reference: string }
  | { failed: string; retryable: boolean };

export type WebhookVerification =
  | { ok: true; deliveryKey: string; reference: string; state: ChargeState }
  | { ok: false; reason: string };

export interface PaymentProvider {
  id: "manual" | "tap";
  begin(args: {
    paymentId: string;
    bookingId: string;
    amountFils: number;
    customer: { userId: string; name: string; email?: string; phone?: string };
    returnUrl: string;
  }): Promise<PaymentBegin>;
  retrieve(args: { reference: string }): Promise<ChargeState>;
  refund(args: {
    reference: string;
    amountFils: number;
    idempotencyKey: string;
  }): Promise<RefundResult>;
  verifyWebhook(raw: {
    headers: Headers;
    body: string;
  }): Promise<WebhookVerification>;
}
