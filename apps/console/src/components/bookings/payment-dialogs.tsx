"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "~/components/common/responsive-dialog";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  formatBookingPriceFils,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

import { FilterSelect } from "./filter-select";
import {
  MANUAL_METHODS,
  usePaymentMutations,
  type ManualMethod,
  type RefundResult,
} from "./payment-mutations";

const controlClass = "h-10 min-h-10 shadow-none";

export function MarkPaidDialog({
  open,
  onOpenChange,
  bookingId,
  priceFils,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  priceFils: number;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const [method, setMethod] = React.useState<ManualMethod>("cash");
  const [reference, setReference] = React.useState("");
  const { settle } = usePaymentMutations(bookingId);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (settle.isPending) {
      return;
    }
    settle.mutate(
      {
        bookingId,
        outcome: "paid",
        method,
        reference: reference.trim() || undefined,
      },
      {
        onSuccess: () => {
          setReference("");
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (settle.isPending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        showCloseButton={false}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Mark as paid</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {formatBookingPriceFils(priceFils)} taken at the Venue.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`method-${bookingId}`}>Method</FieldLabel>
              <FilterSelect
                id={`method-${bookingId}`}
                value={method}
                onChange={(value) => setMethod(value as ManualMethod)}
                options={MANUAL_METHODS}
                className="w-full"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`reference-${bookingId}`}>
                Reference, optional
              </FieldLabel>
              <Input
                id={`reference-${bookingId}`}
                value={reference}
                maxLength={255}
                className={controlClass}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className={controlClass}
              disabled={settle.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={controlClass}
              pending={settle.isPending}
              pendingLabel="Saving…"
            >
              Mark as paid
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

export function RefundDialog({
  open,
  onOpenChange,
  bookingId,
  refundableFils,
  onRefund,
  restoreFocusRef,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  refundableFils: number;
  onRefund?: (result: RefundResult) => void;
  restoreFocusRef?: React.RefObject<HTMLElement | null>;
}) {
  const [amount, setAmount] = React.useState("");
  const [reference, setReference] = React.useState("");
  const { refund } = usePaymentMutations(bookingId, { onRefund });

  React.useEffect(() => {
    if (open) {
      setAmount((refundableFils / 1000).toFixed(3));
      setReference("");
    }
  }, [open, refundableFils]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refund.isPending) {
      return;
    }
    const parsed = parseOptionalPricePerPlayerFils(amount);
    if (!parsed.ok || parsed.fils === null || parsed.fils <= 0) {
      toast.error("Enter a refund amount");
      return;
    }
    if (parsed.fils > refundableFils) {
      toast.error(
        `At most ${formatBookingPriceFils(refundableFils)} can be refunded`,
      );
      return;
    }
    refund.mutate(
      {
        bookingId,
        amountFils: parsed.fils,
        reference: reference.trim() || undefined,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={(next) => {
        if (refund.isPending && !next) {
          return;
        }
        onOpenChange(next);
      }}
    >
      <ResponsiveDialogContent
        restoreFocusRef={restoreFocusRef}
        showCloseButton={false}
      >
        <form onSubmit={onSubmit} className="flex flex-col gap-[18px]">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Record refund</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Up to {formatBookingPriceFils(refundableFils)} can still be
              refunded.
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`refund-amount-${bookingId}`}>
                Amount (BD)
              </FieldLabel>
              <Input
                id={`refund-amount-${bookingId}`}
                inputMode="decimal"
                value={amount}
                className={controlClass}
                onChange={(event) => setAmount(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`refund-reference-${bookingId}`}>
                Reference, optional
              </FieldLabel>
              <Input
                id={`refund-reference-${bookingId}`}
                value={reference}
                maxLength={255}
                className={controlClass}
                onChange={(event) => setReference(event.target.value)}
              />
            </Field>
          </div>
          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="outline"
              className={controlClass}
              disabled={refund.isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className={controlClass}
              pending={refund.isPending}
              pendingLabel="Refunding…"
            >
              Record refund
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
