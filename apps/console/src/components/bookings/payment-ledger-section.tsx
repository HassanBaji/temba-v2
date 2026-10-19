"use client";

import * as React from "react";

import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import {
  refundDisplay,
  refundSource,
  settleActions,
  type RefundDisplay,
} from "./booking-ledger-model";
import type { BookingView, LedgerRow } from "./booking-types";
import { PaymentBadge } from "./payment-badge";
import { MarkPaidDialog, RefundDialog } from "./payment-dialogs";
import { MANUAL_METHODS, usePaymentMutations } from "./payment-mutations";

const PROVIDER_LABELS = {
  manual: "At the Venue",
  tap: "Online (Tap)",
} as const;

const controlClass = "h-10 min-h-10 shadow-none";

function when(value: Date) {
  return `${formatDayMonth(value)}, ${formatGameClock(value)}`;
}

function methodLabel(method: LedgerRow["method"]) {
  return MANUAL_METHODS.find((entry) => entry.value === method)?.label ?? null;
}

export function PaymentLedgerSection({ booking }: { booking: BookingView }) {
  const utils = api.useUtils();
  const manager = booking.manager;
  const [dialog, setDialog] = React.useState<"paid" | "refund" | null>(null);
  const [requestedAt, setRequestedAt] = React.useState<Date | null>(null);

  const { settle } = usePaymentMutations(booking.id);

  const payments = manager?.payments ?? [];
  const refundable = manager?.refundableFils ?? 0;
  const actions = settleActions(booking.status, payments);
  const latestRefundRow = refundSource(payments);
  const display: RefundDisplay = latestRefundRow
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

  function onSettle(outcome: "waived" | "failed") {
    if (settle.isPending) {
      return;
    }
    settle.mutate({ bookingId: booking.id, outcome });
  }

  const showActions =
    actions.pay || actions.waive || actions.fail || refundable > 0;

  return (
    <ConsoleCard>
      <ConsoleCardHeader
        title="Payment"
        action={
          <PaymentBadge
            status={booking.paymentStatus}
            refundInProgress={inProgress}
          />
        }
      />
      {payments.length === 0 ? (
        <p className="text-muted-foreground px-5 py-4 text-[13px]">
          No Payment has been recorded yet.
        </p>
      ) : (
        <ul className="divide-border divide-y">
          {payments.map((payment) => (
            <LedgerItem
              key={payment.id}
              payment={payment}
              refundState={
                payment.id === latestRefundRow?.id ? display : "none"
              }
              onRetry={() => setDialog("refund")}
            />
          ))}
        </ul>
      )}

      {showActions ? (
        <div className="border-border flex flex-wrap items-center gap-2.5 border-t px-5 py-4">
          {actions.pay ? (
            <Button
              className={controlClass}
              disabled={settle.isPending}
              onClick={() => setDialog("paid")}
            >
              Mark as paid
            </Button>
          ) : null}
          {actions.waive ? (
            <Button
              variant="outline"
              className={controlClass}
              disabled={settle.isPending}
              onClick={() => onSettle("waived")}
            >
              Waive
            </Button>
          ) : null}
          {actions.fail ? (
            <Button
              variant="outline"
              className={controlClass}
              disabled={settle.isPending}
              onClick={() => onSettle("failed")}
            >
              Mark failed
            </Button>
          ) : null}
          {refundable > 0 ? (
            <>
              <Button
                variant="outline"
                className={controlClass}
                disabled={inProgress}
                onClick={() => setDialog("refund")}
              >
                Record refund
              </Button>
              <span className="text-muted-foreground text-[13px]">
                Refundable {formatBookingPriceFils(refundable)}
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      <MarkPaidDialog
        open={dialog === "paid"}
        onOpenChange={(next) => setDialog(next ? "paid" : null)}
        bookingId={booking.id}
        priceFils={booking.priceFils}
      />
      <RefundDialog
        open={dialog === "refund"}
        onOpenChange={(next) => setDialog(next ? "refund" : null)}
        bookingId={booking.id}
        refundableFils={refundable}
        onRefund={(result) => {
          if (result.refundInProgress) {
            setRequestedAt(refundSource(result.payments)?.updatedAt ?? null);
          }
        }}
      />
    </ConsoleCard>
  );
}

function LedgerItem({
  payment,
  refundState,
  onRetry,
}: {
  payment: LedgerRow;
  refundState: RefundDisplay;
  onRetry: () => void;
}) {
  const method = methodLabel(payment.method);
  return (
    <li className="space-y-1.5 px-5 py-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {formatBookingPriceFils(payment.amountFils)}
          <span className="text-muted-foreground font-normal">
            {" "}
            · {PROVIDER_LABELS[payment.provider]}
            {method ? ` · ${method}` : ""}
          </span>
        </span>
        <PaymentBadge status={payment.status} />
      </div>
      <dl className="text-muted-foreground space-y-0.5">
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
        <p className="font-semibold">Refund in progress</p>
      ) : null}
      {refundState === "failed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="font-semibold">
            Refund failed: {payment.refundFailureReason}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shadow-none"
            onClick={onRetry}
          >
            Retry
          </Button>
        </div>
      ) : null}
    </li>
  );
}
