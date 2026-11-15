"use client";

import * as React from "react";

import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  refundDisplay,
  refundSource,
  settleActions,
  type RefundDisplay,
} from "./booking-ledger-model";
import type { BookingView, LedgerRow } from "./booking-types";
import { PaymentBadge } from "./payment-badge";
import { MarkPaidDialog, RefundDialog } from "./payment-dialogs";
import { isManualMethod, usePaymentMutations } from "./payment-mutations";

const controlClass = "h-10 min-h-10 shadow-none";

function when(value: Date, locale: Locale) {
  return messagesFor(locale).consoleBookings.ledger.when(
    formatDayMonth(value, locale),
    formatGameClock(value, locale),
  );
}

const ONLINE_METHOD_LABELS = {
  benefitpay: "BenefitPay",
  apple_pay: "Apple Pay",
} as const;

function methodLabel(method: LedgerRow["method"], locale: Locale) {
  if (method === "benefitpay" || method === "apple_pay") {
    return ONLINE_METHOD_LABELS[method];
  }
  return isManualMethod(method)
    ? messagesFor(locale).consoleBookings.methods[method]
    : null;
}

export function PaymentLedgerSection({ booking }: { booking: BookingView }) {
  const m = useMessages().consoleBookings;
  const locale = useLocale();
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
        title={m.ledger.title}
        action={
          <PaymentBadge
            status={booking.paymentStatus}
            refundInProgress={inProgress}
          />
        }
      />
      {payments.length === 0 ? (
        <p className="text-muted-foreground px-5 py-4 text-[13px]">
          {m.ledger.none}
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
              {m.actions.markPaid}
            </Button>
          ) : null}
          {actions.waive ? (
            <Button
              variant="outline"
              className={controlClass}
              disabled={settle.isPending}
              onClick={() => onSettle("waived")}
            >
              {m.actions.waive}
            </Button>
          ) : null}
          {actions.fail ? (
            <Button
              variant="outline"
              className={controlClass}
              disabled={settle.isPending}
              onClick={() => onSettle("failed")}
            >
              {m.actions.markFailed}
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
                {m.actions.recordRefund}
              </Button>
              <span className="text-muted-foreground text-[13px]">
                {m.ledger.refundable(
                  formatBookingPriceFils(refundable, locale),
                )}
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
  const m = useMessages().consoleBookings;
  const ledger = m.ledger;
  const locale = useLocale();
  const method = methodLabel(payment.method, locale);
  return (
    <li className="space-y-1.5 px-5 py-4 text-[13px]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-semibold tabular-nums">
          {formatBookingPriceFils(payment.amountFils, locale)}
          <span className="text-muted-foreground font-normal">
            {ledger.separator}
            {ledger.providers[payment.provider]}
            {method ? `${ledger.separator}${method}` : ""}
          </span>
        </span>
        <PaymentBadge status={payment.status} />
      </div>
      <dl className="text-muted-foreground space-y-0.5">
        {payment.providerReference ? (
          <div>{ledger.reference(payment.providerReference)}</div>
        ) : null}
        {payment.settledAt ? (
          <div>
            {payment.status === "paid"
              ? ledger.settledAt(when(payment.settledAt, locale))
              : ledger.recordedAt(when(payment.settledAt, locale))}
            {payment.settledByName ? ledger.byName(payment.settledByName) : ""}
          </div>
        ) : null}
        {payment.status === "failed" && payment.failureReason ? (
          <div>{ledger.failedReason(payment.failureReason)}</div>
        ) : null}
        {payment.refundedFils > 0 ? (
          <div>
            {ledger.refunded(
              formatBookingPriceFils(payment.refundedFils, locale),
            )}
            {payment.refundedAt ? ` ${when(payment.refundedAt, locale)}` : ""}
            {payment.refundedByName
              ? ledger.byName(payment.refundedByName)
              : ""}
            {payment.refundReference
              ? `${ledger.separator}${payment.refundReference}`
              : ""}
          </div>
        ) : null}
      </dl>
      {refundState === "in_progress" ? (
        <p className="font-semibold">{ledger.refundInProgress}</p>
      ) : null}
      {refundState === "failed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <p role="alert" className="font-semibold">
            {ledger.refundFailed(payment.refundFailureReason ?? "")}
          </p>
          <Button
            size="sm"
            variant="outline"
            className="shadow-none"
            onClick={onRetry}
          >
            {m.actions.retry}
          </Button>
        </div>
      ) : null}
    </li>
  );
}
