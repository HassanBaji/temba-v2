import {
  isOnlinePaymentMethod,
  type BookingPaymentMethod,
  type OnlinePaymentMethod,
  type PaymentState,
} from "@repo/domain/booking-payment";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

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
export function methodName(
  method: string | null | undefined,
  locale: Locale,
): string | null {
  return isOnlinePaymentMethod(method)
    ? paymentMethod(method, locale).title
    : null;
}

const PAGE_HINT_KEYS = {
  card: "card",
  benefit: "benefit",
  benefitpay: "benefitpay",
  apple_pay: "applePay",
} as const satisfies Record<OnlinePaymentMethod, string>;

/** What to do on the hosted page for the method the Customer picked. */
export function paymentPageHint(
  method: string | null | undefined,
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking.pageHints;
  return isOnlinePaymentMethod(method) ? m[PAGE_HINT_KEYS[method]] : m.generic;
}

export function paymentCopy(
  view: Exclude<PaymentView, { kind: "done" }>,
  options: { method: string | null | undefined; slow: boolean; locale: Locale },
): PaymentCopy {
  const m = messagesFor(options.locale).mobileBooking;
  const name = methodName(options.method, options.locale);
  const waiting = view.kind === "open" || view.kind === "checking";

  if (waiting && options.slow) {
    return {
      title: m.payment.slow.title,
      body: m.payment.slow.body(name ?? m.paymentPageName),
      status: m.payment.slow.status,
      hint: m.payment.slow.hint,
    };
  }

  switch (view.kind) {
    case "preparing":
      return {
        title: m.payment.preparing.title,
        body: m.payment.preparing.body,
        status: m.payment.preparing.status,
        hint: null,
      };
    case "open":
      return {
        title: m.payment.open.title,
        body: m.payment.open.body(
          paymentPageHint(options.method, options.locale),
        ),
        status: name ? m.payment.open.statusFor(name) : m.payment.open.status,
        hint: m.payment.open.hint,
      };
    case "checking":
      return {
        title: m.payment.checking.title,
        body: m.payment.checking.body,
        status: m.payment.checking.status,
        hint: null,
      };
    case "failed":
      return {
        title: m.payment.failed.title,
        body:
          view.reason ??
          (name ? m.payment.failed.bodyFor(name) : m.payment.failed.body),
        status: null,
        hint: null,
      };
    case "expired":
      return {
        title: m.payment.expired.title,
        body: m.payment.expired.body,
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
