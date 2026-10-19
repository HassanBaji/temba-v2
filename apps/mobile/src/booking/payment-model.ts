import type { PaymentState } from "@repo/domain/booking-payment";

export const PAYMENT_POLL_MS = 2000;

export type PaymentView =
  | { kind: "waiting"; title: string; description: string }
  | { kind: "open"; redirectUrl: string }
  | { kind: "failed"; title: string; description: string }
  | { kind: "expired"; title: string; description: string }
  | { kind: "done" };

export function paymentView(state: PaymentState): PaymentView {
  switch (state.kind) {
    case "preparing":
      return {
        kind: "waiting",
        title: "Preparing payment",
        description: "Your court is held while we open the payment page.",
      };
    case "pending":
      return {
        kind: "waiting",
        title: "Checking your payment",
        description: "This takes a few seconds.",
      };
    case "redirect":
      return { kind: "open", redirectUrl: state.redirectUrl };
    case "failed":
      return {
        kind: "failed",
        title: "Payment did not go through",
        description: state.reason ?? "Your card was not charged. Try again.",
      };
    case "expired":
      return {
        kind: "expired",
        title: "Your hold ran out",
        description: "The court was released. Pick a time again.",
      };
    case "paid":
    case "deferred":
      return { kind: "done" };
  }
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
