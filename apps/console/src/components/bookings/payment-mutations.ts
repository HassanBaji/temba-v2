"use client";

import { toast } from "sonner";

import { useMessages } from "~/components/locale-provider";
import { api, type RouterOutputs } from "~/trpc/react";
import type { Messages } from "@repo/i18n/messages";

export type RefundResult = RouterOutputs["bookings"]["recordRefund"];

export const MANUAL_METHODS = ["cash", "card", "benefit", "transfer"] as const;

export type ManualMethod = (typeof MANUAL_METHODS)[number];

export function manualMethodOptions(m: Messages["consoleBookings"]) {
  return MANUAL_METHODS.map((value) => ({ value, label: m.methods[value] }));
}

export function isManualMethod(value: unknown): value is ManualMethod {
  return (MANUAL_METHODS as readonly unknown[]).includes(value);
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
  const { consoleBookings: m, consoleShell } = useMessages();
  const onError =
    options.toastErrors === false
      ? undefined
      : (error: { message: string }) => {
          toast.error(error.message || consoleShell.errors.generic);
        };
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
      toast.success(m.toasts.paymentUpdated);
    },
    onError,
  });

  const refund = api.bookings.recordRefund.useMutation({
    onSuccess: async (result) => {
      options.onRefund?.(result);
      await refresh();
      toast.success(
        result.refundInProgress
          ? m.toasts.refundRequested
          : m.toasts.refundRecorded,
      );
    },
    onError,
  });

  return { settle, refund };
}
