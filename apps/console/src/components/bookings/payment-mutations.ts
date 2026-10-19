"use client";

import { toast } from "sonner";

import { api, type RouterOutputs } from "~/trpc/react";

export type RefundResult = RouterOutputs["bookings"]["recordRefund"];

export const MANUAL_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "benefit", label: "Benefit" },
  { value: "transfer", label: "Transfer" },
] as const;

export type ManualMethod = (typeof MANUAL_METHODS)[number]["value"];

function toastMutationError(error: { message: string }) {
  toast.error(error.message || "Something went wrong. Try again.");
}

/** Settle and refund doors with the list and the Booking page kept in step. */
export function usePaymentMutations(
  bookingId: string,
  options: {
    onRefund?: (result: RefundResult) => void;
    /** Off when a confirm dialog reports the failure itself. */
    toastErrors?: boolean;
  } = {},
) {
  const onError =
    options.toastErrors === false ? undefined : toastMutationError;
  const utils = api.useUtils();

  async function refresh() {
    await Promise.all([
      utils.bookings.byId.invalidate({ bookingId }),
      utils.bookings.listForVenue.invalidate(),
    ]);
  }

  const settle = api.bookings.settlePayment.useMutation({
    onSuccess: async () => {
      await refresh();
      toast.success("Payment updated");
    },
    onError,
  });

  const refund = api.bookings.recordRefund.useMutation({
    onSuccess: async (result) => {
      options.onRefund?.(result);
      await refresh();
      toast.success(
        result.refundInProgress ? "Refund requested" : "Refund recorded",
      );
    },
    onError,
  });

  return { settle, refund };
}
