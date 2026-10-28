import type {
  ChargeState,
  PaymentBegin,
  PaymentProvider,
  RefundResult,
  WebhookVerification,
} from "./provider";

type BeginArgs = Parameters<PaymentProvider["begin"]>[0];

/** A scripted stand-in for a hosted-redirect provider such as Tap. */
export class FakePaymentProvider implements PaymentProvider {
  readonly id = "tap" as const;

  readonly beginCalls: BeginArgs[] = [];
  readonly retrieveCalls: string[] = [];
  readonly refundCalls: {
    reference: string;
    amountFils: number;
    idempotencyKey: string;
  }[] = [];

  beginResult: PaymentBegin | Error | null = null;
  chargeState: ChargeState | Error = {
    status: "pending",
    providerStatus: "INITIATED",
  };
  refundResult: RefundResult | Error = { reference: "rfd_fake" };
  webhookResult: WebhookVerification = {
    ok: false,
    reason: "Signature mismatch",
  };

  begin(args: BeginArgs): Promise<PaymentBegin> {
    this.beginCalls.push(args);
    const scripted = this.beginResult;
    if (scripted instanceof Error) {
      return Promise.reject(scripted);
    }
    return Promise.resolve(
      scripted ?? {
        kind: "redirect",
        reference: `chg_${args.paymentId}`,
        redirectUrl: `https://pay.example/${args.paymentId}`,
      },
    );
  }

  retrieve(args: { reference: string }): Promise<ChargeState> {
    this.retrieveCalls.push(args.reference);
    return this.chargeState instanceof Error
      ? Promise.reject(this.chargeState)
      : Promise.resolve(this.chargeState);
  }

  refund(args: {
    reference: string;
    amountFils: number;
    idempotencyKey: string;
  }): Promise<RefundResult> {
    this.refundCalls.push(args);
    return this.refundResult instanceof Error
      ? Promise.reject(this.refundResult)
      : Promise.resolve(this.refundResult);
  }

  verifyWebhook(): Promise<WebhookVerification> {
    return Promise.resolve(this.webhookResult);
  }
}
