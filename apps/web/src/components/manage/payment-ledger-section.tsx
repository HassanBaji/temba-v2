"use client";

import * as React from "react";
import { toast } from "sonner";

import { Section } from "~/components/layout/section";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { toastGlobalFormError } from "~/lib/form-mutation-error";
import { api } from "~/trpc/react";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import {
  formatBookingPriceFils,
  parseOptionalPricePerPlayerFils,
} from "@repo/domain/price-per-player";

import { refundDisplay, settleActions } from "./booking-model";
import type { BookingView } from "./booking-types";
import { PaymentBadge } from "./payment-badge";

type ManagerView = NonNullable<BookingView["manager"]>;
type LedgerRow = ManagerView["payments"][number];

const METHODS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "benefit", label: "Benefit" },
  { value: "transfer", label: "Transfer" },
] as const;

type Method = (typeof METHODS)[number]["value"];

const PROVIDER_LABELS = {
  manual: "At the Venue",
  tap: "Online (Tap)",
} as const;

function when(value: Date) {
  return `${formatDayMonth(value)}, ${formatGameClock(value)}`;
}

function methodLabel(method: LedgerRow["method"]) {
  return METHODS.find((entry) => entry.value === method)?.label ?? null;
}

export function PaymentLedgerSection({ booking }: { booking: BookingView }) {
  const utils = api.useUtils();
  const manager = booking.manager;
  const [method, setMethod] = React.useState<Method>("cash");
  const [reference, setReference] = React.useState("");
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [refundReference, setRefundReference] = React.useState("");
  const [requestedAt, setRequestedAt] = React.useState<Date | null>(null);

  const refresh = React.useCallback(async () => {
    await Promise.all([
      utils.bookings.byId.invalidate({ bookingId: booking.id }),
      utils.bookings.listForVenue.invalidate(),
    ]);
  }, [utils, booking.id]);

  const settle = api.bookings.settlePayment.useMutation({
    onSuccess: async () => {
      setReference("");
      await refresh();
      toast.success("Payment updated");
    },
    onError: (error) => toastGlobalFormError(error),
  });

  const refund = api.bookings.recordRefund.useMutation({
    onSuccess: async (result) => {
      setRefundOpen(false);
      setAmount("");
      setRefundReference("");
      if (result.refundInProgress) {
        const source = result.payments.find(
          (payment) =>
            payment.status === "paid" ||
            payment.status === "partially_refunded",
        );
        setRequestedAt(source?.updatedAt ?? null);
      }
      await refresh();
      toast.success(
        result.refundInProgress ? "Refund requested" : "Refund recorded",
      );
    },
    onError: (error) => toastGlobalFormError(error),
  });

  const payments = manager?.payments ?? [];
  const refundable = manager?.refundableFils ?? 0;
  const actions = settleActions(booking.status, payments);
  const latestRefundRow = payments.find(
    (payment) =>
      payment.status === "paid" || payment.status === "partially_refunded",
  );
  const display = latestRefundRow
    ? refundDisplay(latestRefundRow, requestedAt)
    : "none";
  const inProgress = display === "in_progress";

  React.useEffect(() => {
    if (!inProgress) {
      return;
    }
    const timer = setInterval(() => {
      void utils.bookings.byId.invalidate({ bookingId: booking.id });
    }, 3000);
    return () => clearInterval(timer);
  }, [inProgress, utils, booking.id]);

  if (!manager) {
    return null;
  }

  function onSettle(outcome: "paid" | "waived" | "failed") {
    if (settle.isPending) {
      return;
    }
    settle.mutate({
      bookingId: booking.id,
      outcome,
      method: outcome === "paid" ? method : undefined,
      reference: reference.trim() || undefined,
    });
  }

  function onRefund(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (refund.isPending) {
      return;
    }
    const parsed = parseOptionalPricePerPlayerFils(amount);
    if (!parsed.ok || parsed.fils === null || parsed.fils <= 0) {
      toast.error("Enter a refund amount");
      return;
    }
    if (parsed.fils > refundable) {
      toast.error(
        `At most ${formatBookingPriceFils(refundable)} can be refunded`,
      );
      return;
    }
    refund.mutate({
      bookingId: booking.id,
      amountFils: parsed.fils,
      reference: refundReference.trim() || undefined,
    });
  }

  return (
    <Section
      title="Payment"
      description={`Price ${formatBookingPriceFils(booking.priceFils)}`}
      action={
        <PaymentBadge
          status={booking.paymentStatus}
          refundInProgress={inProgress}
        />
      }
    >
      {payments.length === 0 ? (
        <p className="text-body text-muted-foreground">
          No Payment has been recorded yet.
        </p>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {payments.map((payment) => (
            <LedgerItem
              key={payment.id}
              payment={payment}
              refundState={
                payment.id === latestRefundRow?.id ? display : "none"
              }
              onRetry={() => {
                setAmount((refundable / 1000).toFixed(3));
                setRefundOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      {actions.pay || actions.waive || actions.fail ? (
        <div className="space-y-3">
          {actions.pay ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`method-${booking.id}`}>Method</FieldLabel>
                <select
                  id={`method-${booking.id}`}
                  value={method}
                  onChange={(event) => setMethod(event.target.value as Method)}
                  className="border-input text-body h-10 rounded-md border bg-transparent px-3"
                >
                  {METHODS.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor={`reference-${booking.id}`}>
                  Reference
                </FieldLabel>
                <Input
                  id={`reference-${booking.id}`}
                  value={reference}
                  maxLength={255}
                  onChange={(event) => setReference(event.target.value)}
                />
              </Field>
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {actions.pay ? (
              <Button
                disabled={settle.isPending}
                onClick={() => onSettle("paid")}
              >
                Mark paid
              </Button>
            ) : null}
            {actions.waive ? (
              <Button
                variant="outline"
                disabled={settle.isPending}
                onClick={() => onSettle("waived")}
              >
                Waive
              </Button>
            ) : null}
            {actions.fail ? (
              <Button
                variant="outline"
                disabled={settle.isPending}
                onClick={() => onSettle("failed")}
              >
                Mark failed
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {refundable > 0 ? (
        refundOpen ? (
          <form onSubmit={onRefund} className="space-y-3">
            <p className="text-body text-muted-foreground">
              Refundable: {formatBookingPriceFils(refundable)}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`refund-amount-${booking.id}`}>
                  Amount (BD)
                </FieldLabel>
                <Input
                  id={`refund-amount-${booking.id}`}
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`refund-reference-${booking.id}`}>
                  Reference
                </FieldLabel>
                <Input
                  id={`refund-reference-${booking.id}`}
                  value={refundReference}
                  maxLength={255}
                  onChange={(event) => setRefundReference(event.target.value)}
                />
              </Field>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={refund.isPending}>
                {refund.isPending ? "Refunding…" : "Record refund"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setRefundOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              disabled={inProgress}
              onClick={() => {
                setAmount((refundable / 1000).toFixed(3));
                setRefundOpen(true);
              }}
            >
              Record refund
            </Button>
            <span className="text-body text-muted-foreground">
              Refundable: {formatBookingPriceFils(refundable)}
            </span>
          </div>
        )
      ) : null}
    </Section>
  );
}

function LedgerItem({
  payment,
  refundState,
  onRetry,
}: {
  payment: LedgerRow;
  refundState: "none" | "in_progress" | "failed";
  onRetry: () => void;
}) {
  return (
    <li className="space-y-1 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-body font-semibold">
          {formatBookingPriceFils(payment.amountFils)}
          <span className="text-muted-foreground font-normal">
            {" "}
            · {PROVIDER_LABELS[payment.provider]}
            {methodLabel(payment.method)
              ? ` · ${methodLabel(payment.method)}`
              : ""}
          </span>
        </span>
        <PaymentBadge status={payment.status} />
      </div>
      <dl className="text-body text-muted-foreground space-y-0.5">
        {payment.providerReference ? (
          <div>Reference {payment.providerReference}</div>
        ) : null}
        {payment.settledAt ? (
          <div>
            {payment.status === "paid" ? "Settled" : "Recorded"}{" "}
            {when(payment.settledAt)}
            {payment.settledByName ? ` by ${payment.settledByName}` : ""}
          </div>
        ) : null}
        {payment.status === "failed" && payment.failureReason ? (
          <div>Failed: {payment.failureReason}</div>
        ) : null}
        {payment.refundedFils > 0 ? (
          <div>
            Refunded {formatBookingPriceFils(payment.refundedFils)}
            {payment.refundedAt ? ` ${when(payment.refundedAt)}` : ""}
            {payment.refundedByName ? ` by ${payment.refundedByName}` : ""}
            {payment.refundReference ? ` · ${payment.refundReference}` : ""}
          </div>
        ) : null}
      </dl>
      {refundState === "in_progress" ? (
        <p className="text-body font-semibold">Refund in progress</p>
      ) : null}
      {refundState === "failed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="text-body font-semibold">
            Refund failed: {payment.refundFailureReason}
          </p>
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}
    </li>
  );
}
