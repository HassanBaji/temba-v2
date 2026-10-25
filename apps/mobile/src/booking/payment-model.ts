import {
  isOnlinePaymentMethod,
  type BookingPaymentMethod,
  type OnlinePaymentMethod,
  type PaymentState,
} from "@repo/domain/booking-payment";

import { paymentMethod } from "./booking-model";

export const PAYMENT_POLL_MS = 2000;

/** How long a wait looks normal before the screen says it is slow. */
export const PAYMENT_SLOW_AFTER_MS = 60_000;

export type PaymentView =
  | { kind: "preparing" }
  | { kind: "open"; redirectUrl: string }
  | { kind: "checking" }
  | { kind: "failed"; reason: string | null }
  | { kind: "expired" }
  | { kind: "done" };

export function paymentView(state: PaymentState): PaymentView {
  switch (state.kind) {
    case "preparing":
      return { kind: "preparing" };
    case "pending":
      return { kind: "checking" };
    case "redirect":
      return { kind: "open", redirectUrl: state.redirectUrl };
    case "failed":
      return { kind: "failed", reason: state.reason };
    case "expired":
      return { kind: "expired" };
    case "paid":
    case "deferred":
      return { kind: "done" };
  }
}

export type PaymentCopy = {
  title: string;
  body: string;
  /** The live line in the details card while the screen waits. */
  status: string | null;
  hint: string | null;
};

/** "BenefitPay", or null when the Payment has no known online method. */
export function methodName(method: string | null | undefined): string | null {
  return isOnlinePaymentMethod(method) ? paymentMethod(method).title : null;
}

const PAGE_HINTS: Record<OnlinePaymentMethod, string> = {
  card: "Enter your card on the payment page, then come back here.",
  benefit:
    "Enter your BENEFIT card and PIN on the payment page, then come back here.",
  benefitpay:
    "Approve in the BenefitPay app or scan the QR code, then come back here.",
  apple_pay: "Confirm with Apple Pay on the payment page, then come back here.",
};

/** What to do on the hosted page for the method the Customer picked. */
export function paymentPageHint(method: string | null | undefined): string {
  return isOnlinePaymentMethod(method)
    ? PAGE_HINTS[method]
    : "Finish paying on the payment page, then come back here.";
}

export function paymentCopy(
  view: Exclude<PaymentView, { kind: "done" }>,
  options: { method: string | null | undefined; slow: boolean },
): PaymentCopy {
  const name = methodName(options.method);
  const waiting = view.kind === "open" || view.kind === "checking";

  if (waiting && options.slow) {
    return {
      title: "Still waiting.",
      body: `${name ?? "The payment page"} has not confirmed yet. This can take a minute. Keep this screen open, it updates the moment it lands.`,
      status: "Taking longer than usual",
      hint: "If the payment page showed success but this has not updated, check status. Checking never charges you twice.",
    };
  }

  switch (view.kind) {
    case "preparing":
      return {
        title: "Getting the payment page ready.",
        body: "Your court is held while we set up the payment.",
        status: "Preparing",
        hint: null,
      };
    case "open":
      return {
        title: "Finish paying in your browser.",
        body: `${paymentPageHint(options.method)} This screen updates on its own.`,
        status: name ? `Waiting for ${name}` : "Waiting for payment",
        hint: "Closed the browser by mistake? Open it again below.",
      };
    case "checking":
      return {
        title: "Checking your payment.",
        body: "This takes a few seconds. Keep this screen open.",
        status: "Confirming",
        hint: null,
      };
    case "failed":
      return {
        title: "Payment did not go through.",
        body:
          view.reason ??
          `Nothing was charged${name ? ` to ${name}` : ""}. Try again, or pay another way.`,
        status: null,
        hint: null,
      };
    case "expired":
      return {
        title: "Your hold ran out.",
        body: "The court was released so others can book it. Pick a time again.",
        status: null,
        hint: null,
      };
  }
}

/** The ways to retry a failed Payment: the Venue's online methods on this device. */
export function retryMethods(
  methods: readonly BookingPaymentMethod[],
): OnlinePaymentMethod[] {
  return methods.filter(isOnlinePaymentMethod);
}

export function shouldPoll(state: PaymentState | undefined): boolean {
  return (
    state === undefined ||
    state.kind === "preparing" ||
    state.kind === "pending" ||
    state.kind === "redirect"
  );
}

/** "9:05" left on the hold, or null once it has lapsed. */
export function holdCountdown(
  holdExpiresAt: Date | null,
  now: Date,
): string | null {
  if (!holdExpiresAt) {
    return null;
  }
  const seconds = Math.ceil((holdExpiresAt.getTime() - now.getTime()) / 1000);
  if (seconds <= 0) {
    return null;
  }
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Whether a wait that began at `since` has run long enough to call slow. */
export function isSlowWait(since: Date | null, now: Date): boolean {
  return (
    since !== null && now.getTime() - since.getTime() >= PAYMENT_SLOW_AFTER_MS
  );
}
