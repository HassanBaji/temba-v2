"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  BookingActionDialogs,
  type BookingAction,
} from "~/components/bookings/booking-action-dialogs";
import { settleActions } from "~/components/bookings/booking-ledger-model";
import { MarkPaidDialog } from "~/components/bookings/payment-dialogs";
import { bookingPath } from "~/lib/console-paths";
import { api } from "~/trpc/react";
import { useLocale, useMessages } from "~/components/locale-provider";
import { paymentStatusLabel } from "@repo/domain/booking-payment";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import { bookingTimeLabel } from "./booking-block";
import { durationLabel } from "~/components/bookings/booking-list-model";
import { holderName, type VenueBooking } from "./booking-types";

export function BookingPanel({
  venueId,
  booking,
  onClose,
}: {
  venueId: string;
  booking: VenueBooking;
  onClose: () => void;
}) {
  const m = useMessages().consoleSchedule.panel;
  const locale = useLocale();
  const settled =
    booking.status !== "pending_payment" && booking.status !== "cancelled";
  const [markingPaid, setMarkingPaid] = useState(false);
  const markPaidRef = useRef<HTMLButtonElement | null>(null);
  const [action, setAction] = useState<BookingAction | null>(null);
  const actionRef = useRef<HTMLButtonElement | null>(null);
  const view = api.bookings.byId.useQuery({ bookingId: booking.id });
  const manager = view.data?.manager ?? null;
  const canPay = manager
    ? settleActions(booking.status, manager.payments).pay
    : false;
  const allowed = manager?.actions;

  return (
    <aside
      aria-label={m.selectedBooking}
      className="border-rule bg-paper flex w-[var(--console-panel-width)] shrink-0 flex-col overflow-y-auto border-s"
    >
      <div className="flex items-center justify-between gap-3 px-[22px] pt-5">
        <h2 className="font-expanded min-w-0 truncate text-[20px]">
          {holderName(booking.holder, locale)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={m.close}
          className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block flex size-8 shrink-0 items-center justify-center transition-colors"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="text-muted-foreground px-[22px] pt-1 text-[13px]">
        {m.dateAndTime(
          formatDayMonth(booking.startsAt, locale, { weekday: "long" }),
          bookingTimeLabel(booking, locale),
        )}
      </p>

      <dl className="flex flex-col gap-4 px-[22px] pt-5">
        <Row label={m.customer}>
          {booking.holder.kind === "guest"
            ? booking.holder.phone || m.guest
            : m.tembaAccount}
        </Row>
        <Row label={m.court}>{booking.courtName}</Row>
        <Row label={m.time}>{bookingTimeLabel(booking, locale)}</Row>
        <Row label={m.duration}>
          {durationLabel(booking.startsAt, booking.endsAt, locale)}
        </Row>
        <Row label={m.price}>
          {formatBookingPriceFils(booking.priceFils, locale)}
        </Row>
        <Row label={m.payment}>
          {settled ? (
            <Badge
              variant={booking.paymentStatus === "paid" ? "default" : "outline"}
            >
              {paymentStatusLabel(booking.paymentStatus, locale)}
            </Badge>
          ) : (
            <Badge variant="outline">{booking.statusLabel}</Badge>
          )}
        </Row>
        <Row label={m.source}>
          {booking.source === "venue" ? m.manual : m.appBooking}
        </Row>
        {booking.status === "no_show" ? (
          <Row label={m.status}>{booking.statusLabel}</Row>
        ) : null}
      </dl>

      <div className="border-rule mt-auto flex flex-col gap-2 border-t px-[22px] py-[18px]">
        {canPay ? (
          <Button
            ref={markPaidRef}
            type="button"
            variant="outline"
            className="rounded-control h-10 min-h-10 w-full text-sm font-semibold shadow-none"
            onClick={() => setMarkingPaid(true)}
          >
            {m.markPaid}
          </Button>
        ) : null}
        {allowed?.edit || allowed?.noShow || allowed?.cancel ? (
          <div className="flex gap-2">
            {(["edit", "noShow", "cancel"] as const)
              .filter((key) => allowed[key])
              .map((key) => (
                <Button
                  key={key}
                  type="button"
                  variant="outline"
                  className="rounded-control h-10 min-h-10 flex-1 text-sm font-semibold shadow-none"
                  onClick={(event) => {
                    actionRef.current = event.currentTarget;
                    setAction(key);
                  }}
                >
                  {m[key]}
                </Button>
              ))}
          </div>
        ) : null}
        <Button
          asChild
          className="rounded-control h-10 min-h-10 w-full text-sm font-semibold"
        >
          <Link href={bookingPath(venueId, booking.id)}>{m.openBooking}</Link>
        </Button>
      </div>

      <MarkPaidDialog
        open={markingPaid}
        onOpenChange={setMarkingPaid}
        bookingId={booking.id}
        priceFils={booking.priceFils}
        restoreFocusRef={markPaidRef}
      />
      {view.data ? (
        <BookingActionDialogs
          booking={view.data}
          action={action}
          onActionChange={setAction}
          restoreFocusRef={actionRef}
        />
      ) : null}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <dt className="text-muted-foreground shrink-0">{label}</dt>
      <dd className="min-w-0 truncate text-end font-semibold">{children}</dd>
    </div>
  );
}
