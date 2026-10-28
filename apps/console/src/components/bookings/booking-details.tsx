"use client";

import { ExternalLink } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";

import { ErrorState } from "~/components/common/error-state";
import {
  ConsoleCard,
  ConsoleCardHeader,
} from "~/components/console/console-card";
import { PageHeader } from "~/components/console/page-header";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import {
  bookingTitle,
  durationLabel,
  sourceLabel,
  timeRangeLabel,
} from "./booking-list-model";
import {
  BookingActionDialogs,
  type BookingAction,
} from "./booking-action-dialogs";
import { BookingMonogram } from "./booking-monogram";
import { holderName, type BookingView } from "./booking-types";
import { PaymentLedgerSection } from "./payment-ledger-section";

const webOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN;

function when(value: Date) {
  return `${formatDayMonth(value, { weekday: "short" })}, ${formatGameClock(value)}`;
}

export function BookingDetails({ bookingId }: { bookingId: string }) {
  const booking = api.bookings.byId.useQuery({ bookingId });

  if (booking.isLoading) {
    return (
      <div aria-busy="true" aria-live="polite" className="flex flex-col gap-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-5 lg:grid-cols-2">
          <Skeleton className="rounded-card h-72" />
          <Skeleton className="rounded-card h-72" />
        </div>
      </div>
    );
  }
  if (booking.error || !booking.data) {
    return (
      <ErrorState
        title="Booking could not be loaded"
        message={booking.error?.message}
        onRetry={() => {
          void booking.refetch();
        }}
      />
    );
  }
  const data = booking.data;
  if (!data.manager) {
    return (
      <ErrorState
        title="Booking could not be loaded"
        message="Only Venue managers can see this view"
        onRetry={() => {
          void booking.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <PageHeader
        title={bookingTitle(data)}
        description={`${holderName(data.manager.holder)} · ${statusText(data)}`}
        action={<BookingActions booking={data} />}
      />
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <BookingFacts booking={data} />
          <GameCard booking={data} />
        </div>
        <div className="flex flex-col gap-5">
          <PaymentLedgerSection booking={data} />
          <AuditTrail booking={data} />
        </div>
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<BookingAction, string> = {
  edit: "Edit",
  noShow: "Mark no-show",
  cancel: "Cancel booking",
};

function BookingActions({ booking }: { booking: BookingView }) {
  const [action, setAction] = useState<BookingAction | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const allowed = booking.manager!.actions;
  const available = (["edit", "noShow", "cancel"] as const).filter(
    (key) => allowed[key],
  );
  if (available.length === 0) {
    return null;
  }

  return (
    <>
      {available.map((key) => (
        <Button
          key={key}
          type="button"
          variant="outline"
          className="rounded-control h-10 min-h-10 text-sm font-semibold shadow-none"
          onClick={(event) => {
            triggerRef.current = event.currentTarget;
            setAction(key);
          }}
        >
          {ACTION_LABELS[key]}
        </Button>
      ))}
      <BookingActionDialogs
        booking={booking}
        action={action}
        onActionChange={setAction}
        restoreFocusRef={triggerRef}
      />
    </>
  );
}

function statusText(booking: BookingView) {
  if (booking.status === "pending_payment") {
    return booking.holdExpiresAt
      ? `Awaiting payment, held until ${formatGameClock(booking.holdExpiresAt)}`
      : "Awaiting payment";
  }
  return booking.statusLabel;
}

function BookingFacts({ booking }: { booking: BookingView }) {
  const manager = booking.manager!;
  const holder = manager.holder;
  return (
    <ConsoleCard>
      <ConsoleCardHeader title="Booking" />
      <dl className="divide-border divide-y text-[13px]">
        <Fact label="Customer">
          <span className="flex items-center gap-2.5">
            <BookingMonogram holder={holder} />
            <span className="min-w-0">
              <span className="block truncate">{holderName(holder)}</span>
              <span className="text-muted-foreground block truncate">
                {holder.kind === "guest"
                  ? holder.phone || "Guest"
                  : "Temba account"}
              </span>
            </span>
          </span>
        </Fact>
        <Fact label="Court">{booking.court.name}</Fact>
        <Fact label="Time">
          {formatDayMonth(booking.startsAt, { weekday: "short", year: true })},{" "}
          {timeRangeLabel(booking.startsAt, booking.endsAt)}
        </Fact>
        <Fact label="Duration">
          {durationLabel(booking.startsAt, booking.endsAt)}
        </Fact>
        <Fact label="Price">
          <span className="tabular-nums">
            {formatBookingPriceFils(booking.priceFils)}
          </span>
        </Fact>
        <Fact label="Source">{sourceLabel(booking.source)}</Fact>
        <Fact label="Status">{statusText(booking)}</Fact>
        {manager.managerNotes ? (
          <Fact label="Notes">{manager.managerNotes}</Fact>
        ) : null}
        <Fact label="Cancellation policy">
          <ul className="text-muted-foreground space-y-0.5">
            {booking.cancellationPolicyLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </Fact>
      </dl>
    </ConsoleCard>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[132px_1fr] gap-4 px-5 py-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </div>
  );
}

function GameCard({ booking }: { booking: BookingView }) {
  const game = booking.game;
  return (
    <ConsoleCard>
      <ConsoleCardHeader title="Game" />
      <div className="px-5 py-4 text-[13px]">
        {game ? (
          <div className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate">{game.name ?? "Open Game"}</span>
            {webOrigin ? (
              <a
                href={`${webOrigin}/dashboard/games/${game.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 underline-offset-4 hover:underline"
              >
                Open in Temba
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">No Game is attached.</p>
        )}
      </div>
    </ConsoleCard>
  );
}

function AuditTrail({ booking }: { booking: BookingView }) {
  const manager = booking.manager!;
  const entries: { at: Date; text: string }[] = [
    {
      at: manager.createdAt,
      text: `Created (${booking.source === "venue" ? "by the Venue" : "in the app"})`,
    },
  ];
  if (booking.cancelledAt) {
    const parts = [
      `Cancelled by ${booking.cancelledBy === "venue" ? "the Venue" : "the Customer"}`,
    ];
    if (booking.refundDueFils !== null) {
      parts.push(`refund due ${formatBookingPriceFils(booking.refundDueFils)}`);
    }
    if (booking.cancellationChargeFils) {
      parts.push(
        `cancellation charge ${formatBookingPriceFils(booking.cancellationChargeFils)} (information only)`,
      );
    }
    if (booking.cancelReason) {
      parts.push(booking.cancelReason);
    }
    entries.push({ at: booking.cancelledAt, text: parts.join(" · ") });
  }
  if (manager.noShowAt) {
    entries.push({ at: manager.noShowAt, text: "Marked no-show" });
  }
  entries.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <ConsoleCard>
      <ConsoleCardHeader title="History" />
      <ol className="divide-border divide-y text-[13px]">
        {entries.map((entry) => (
          <li
            key={`${entry.at.getTime()}-${entry.text}`}
            className="grid grid-cols-[132px_1fr] gap-4 px-5 py-3"
          >
            <span className="text-muted-foreground tabular-nums">
              {when(entry.at)}
            </span>
            <span>{entry.text}</span>
          </li>
        ))}
      </ol>
    </ConsoleCard>
  );
}
