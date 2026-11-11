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
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  filsToMajorInput,
  formatBookingPriceFils,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

import { FilterSelect } from "./filter-select";
import {
  manualMethodOptions,
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
  const { consoleBookings: m, common } = useMessages();
  const locale = useLocale();
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
            <ResponsiveDialogTitle>{m.markPaid.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {m.markPaid.description(
                formatBookingPriceFils(priceFils, locale),
              )}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`method-${bookingId}`}>
                {m.markPaid.method}
              </FieldLabel>
              <FilterSelect
                id={`method-${bookingId}`}
                value={method}
                onChange={(value) => setMethod(value as ManualMethod)}
                options={manualMethodOptions(m)}
                className="w-full"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`reference-${bookingId}`}>
                {m.markPaid.reference}
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
              {common.cancel}
            </Button>
            <Button
              type="submit"
              className={controlClass}
              pending={settle.isPending}
              pendingLabel={common.saving}
            >
              {m.markPaid.title}
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
  const { consoleBookings: m, common } = useMessages();
  const locale = useLocale();
  const [amount, setAmount] = React.useState("");
  const [reference, setReference] = React.useState("");
  const { refund } = usePaymentMutations(bookingId, { onRefund });

  React.useEffect(() => {
    if (open) {
      setAmount(filsToMajorInput(refundableFils));
      setReference("");
    }
  }, [open, refundableFils]);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refund.isPending) {
      return;
    }
    const parsed = parseOptionalPricePerPlayerFils(amount, locale);
    if (!parsed.ok || parsed.fils === null || parsed.fils <= 0) {
      toast.error(m.refund.enterAmount);
      return;
    }
    if (parsed.fils > refundableFils) {
      toast.error(
        m.refund.atMost(formatBookingPriceFils(refundableFils, locale)),
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
            <ResponsiveDialogTitle>{m.refund.title}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {m.refund.description(
                formatBookingPriceFils(refundableFils, locale),
              )}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`refund-amount-${bookingId}`}>
                {m.refund.amount}
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
                {m.refund.reference}
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
              {common.cancel}
            </Button>
            <Button
              type="submit"
              className={controlClass}
              pending={refund.isPending}
              pendingLabel={m.refund.refunding}
            >
              {m.refund.title}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
