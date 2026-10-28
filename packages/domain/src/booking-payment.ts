export const PAYMENT_HOLD_MINUTES = 10;

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded"
  | "partially_refunded"
  | "waived";

export type PaymentProviderId = "manual" | "tap";

/** The ways Tap can take a Customer's money online, each its own hosted page. */
export const ONLINE_PAYMENT_METHODS = [
  "card",
  "benefit",
  "benefitpay",
  "apple_pay",
] as const;

export type OnlinePaymentMethod = (typeof ONLINE_PAYMENT_METHODS)[number];

/** What a Customer picks at checkout: one online method, or pay at the Venue. */
export type BookingPaymentMethod = OnlinePaymentMethod | "at_venue";

export function isOnlinePaymentMethod(
  method: string | null | undefined,
): method is OnlinePaymentMethod {
  return (
    ONLINE_PAYMENT_METHODS as readonly (string | null | undefined)[]
  ).includes(method);
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
  waived: "Waived",
};

export function paymentStatusLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status];
}

export function paymentHoldExpiresAt(now: Date): Date {
  return new Date(now.getTime() + PAYMENT_HOLD_MINUTES * 60_000);
}

/**
 * The Booking's payment status from its Payment rows: the latest attempt that
 * did not fail, `failed` when every attempt failed, `pending` when there is
 * no attempt. Rows with equal `createdAt` keep their given order.
 */
export function summarisePaymentStatus(
  rows: readonly { status: PaymentStatus; createdAt: Date }[],
): PaymentStatus {
  const ordered = rows
    .map((row, index) => ({ row, index }))
    .sort(
      (a, b) =>
        a.row.createdAt.getTime() - b.row.createdAt.getTime() ||
        a.index - b.index,
    )
    .map(({ row }) => row);
  const settled = ordered.filter((row) => row.status !== "failed");
  const latestSettled = settled[settled.length - 1];
  if (latestSettled) {
    return latestSettled.status;
  }
  return ordered.length > 0 ? "failed" : "pending";
}

export type PaymentState =
  | { kind: "deferred" }
  | { kind: "preparing" }
  | { kind: "redirect"; redirectUrl: string }
  | { kind: "pending" }
  | { kind: "paid" }
  | { kind: "failed"; reason: string | null }
  | { kind: "expired" };

type StateBooking = {
  status: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "expired";
  holdExpiresAt: Date | null;
};

type StatePayment = {
  provider: PaymentProviderId;
  status: PaymentStatus;
  providerStatus: string | null;
  clientRedirectUrl: string | null;
  failureReason: string | null;
};

const CHARGE_NOT_OPENED = new Set(["INITIATED"]);

/** What the confirm screen shows for a Booking and its latest Payment. */
export function paymentStateFor(
  booking: StateBooking,
  payment: StatePayment | null,
  now: Date,
): PaymentState {
  if (booking.status === "expired" || booking.status === "cancelled") {
    return { kind: "expired" };
  }
  if (booking.status !== "pending_payment") {
    return payment?.provider === "manual" && payment.status === "pending"
      ? { kind: "deferred" }
      : { kind: "paid" };
  }
  if (!booking.holdExpiresAt || booking.holdExpiresAt <= now) {
    return { kind: "expired" };
  }
  if (!payment) {
    return { kind: "preparing" };
  }
  if (payment.status === "failed") {
    return { kind: "failed", reason: payment.failureReason };
  }
  if (payment.status !== "pending") {
    return { kind: "paid" };
  }
  if (payment.provider === "manual") {
    return { kind: "deferred" };
  }
  if (!payment.clientRedirectUrl) {
    return { kind: "preparing" };
  }
  const opened =
    payment.providerStatus !== null &&
    !CHARGE_NOT_OPENED.has(payment.providerStatus);
  return opened
    ? { kind: "pending" }
    : { kind: "redirect", redirectUrl: payment.clientRedirectUrl };
}
