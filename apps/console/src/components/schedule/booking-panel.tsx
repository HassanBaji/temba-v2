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
import { paymentStatusLabel } from "@repo/domain/booking-payment";
import { formatDayMonth } from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import { bookingTimeLabel } from "./booking-block";
import { durationMinutes } from "./booking-model";
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
      aria-label="Selected Booking"
      className="border-rule bg-paper flex w-[var(--console-panel-width)] shrink-0 flex-col overflow-y-auto border-l"
    >
      <div className="flex items-center justify-between gap-3 px-[22px] pt-5">
        <h2 className="font-expanded min-w-0 truncate text-[20px]">
          {holderName(booking.holder)}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block flex size-8 shrink-0 items-center justify-center transition-colors"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
      <p className="text-muted-foreground px-[22px] pt-1 text-[13px]">
        {formatDayMonth(booking.startsAt, { weekday: "long" })},{" "}
        {bookingTimeLabel(booking)}
      </p>

      <dl className="flex flex-col gap-4 px-[22px] pt-5">
        <Row label="Customer">
          {booking.holder.kind === "guest"
            ? booking.holder.phone || "Guest"
            : "Temba account"}
        </Row>
        <Row label="Court">{booking.courtName}</Row>
        <Row label="Time">{bookingTimeLabel(booking)}</Row>
        <Row label="Duration">{durationMinutes(booking)} min</Row>
        <Row label="Price">{formatBookingPriceFils(booking.priceFils)}</Row>
        <Row label="Payment">
          {settled ? (
            <Badge
              variant={booking.paymentStatus === "paid" ? "default" : "outline"}
            >
              {paymentStatusLabel(booking.paymentStatus)}
            </Badge>
          ) : (
            <Badge variant="outline">{booking.statusLabel}</Badge>
          )}
        </Row>
        <Row label="Source">
          {booking.source === "venue" ? "Manual" : "App booking"}
        </Row>
        {booking.status === "no_show" ? (
          <Row label="Status">{booking.statusLabel}</Row>
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
            Mark as paid
          </Button>
        ) : null}
        {allowed?.edit || allowed?.noShow || allowed?.cancel ? (
          <div className="flex gap-2">
            {(
              [
                ["edit", "Edit"],
                ["noShow", "No-show"],
                ["cancel", "Cancel"],
              ] as const
            )
              .filter(([key]) => allowed[key])
              .map(([key, label]) => (
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
                  {label}
                </Button>
              ))}
          </div>
        ) : null}
        <Button
          asChild
          className="rounded-control h-10 min-h-10 w-full text-sm font-semibold"
        >
          <Link href={bookingPath(venueId, booking.id)}>Open booking</Link>
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
      <dd className="min-w-0 truncate text-right font-semibold">{children}</dd>
    </div>
  );
}
