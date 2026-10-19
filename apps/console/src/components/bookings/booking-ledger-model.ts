export type RefundDisplay = "none" | "in_progress" | "failed";

/**
 * A Tap refund is a job: the door returns at once and the job later records
 * the result. While the Payment row has not changed since the request, the
 * refund is still in progress.
 */
export function refundDisplay(
  payment: { updatedAt: Date; refundFailureReason: string | null },
  requestedAtUpdatedAt: Date | null,
): RefundDisplay {
  if (payment.updatedAt.getTime() === requestedAtUpdatedAt?.getTime()) {
    return "in_progress";
  }
  return payment.refundFailureReason ? "failed" : "none";
}

export type LedgerPayment = {
  provider: "manual" | "tap";
  status:
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded"
    | "waived";
  createdAt: Date;
};

export type SettleActions = { pay: boolean; waive: boolean; fail: boolean };

/**
 * What a manager can do to the latest Payment by hand. A Booking with no
 * Payment row yet (a legacy row) is settled as a manual one.
 */
export function settleActions(
  bookingStatus: string,
  payments: readonly LedgerPayment[],
): SettleActions {
  const none = { pay: false, waive: false, fail: false };
  if (bookingStatus !== "confirmed" && bookingStatus !== "no_show") {
    return none;
  }
  const latest = [...payments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  if (!latest) {
    return { pay: true, waive: true, fail: true };
  }
  if (latest.provider === "manual" && latest.status === "pending") {
    return { pay: true, waive: true, fail: true };
  }
  if (latest.provider === "tap" && latest.status === "failed") {
    return { pay: false, waive: true, fail: false };
  }
  return none;
}

/** The Payment row a refund would come out of, as the door picks it. */
export function refundSource<T extends { status: LedgerPayment["status"] }>(
  payments: readonly T[],
): T | undefined {
  return payments.find(
    (payment) =>
      payment.status === "paid" || payment.status === "partially_refunded",
  );
}
