"use client";

import Link from "next/link";

import { ErrorState } from "~/components/common/error-state";
import { Badge } from "~/components/ui/badge";
import { Skeleton } from "~/components/ui/skeleton";
import { api } from "~/trpc/react";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";

import type { BookingView } from "./booking-types";
import { PaymentLedgerSection } from "./payment-ledger-section";

function when(value: Date) {
  return `${formatDayMonth(value, { weekday: "short" })}, ${formatGameClock(value)}`;
}

export function BookingDetails({ bookingId }: { bookingId: string }) {
  const booking = api.bookings.byId.useQuery({ bookingId });

  if (booking.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
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
    <div className="space-y-6">
      <BookingSummary booking={data} />
      <PaymentLedgerSection booking={data} />
      <AuditTrail booking={data} />
    </div>
  );
}

function BookingSummary({ booking }: { booking: BookingView }) {
  const manager = booking.manager!;
  const holder = manager.holder;
  return (
    <Section
      title={holder.name || "Customer"}
      description={
        holder.kind === "guest" ? `Guest · ${holder.phone}` : "Customer"
      }
      action={<Badge variant="outline">{booking.statusLabel}</Badge>}
    >
      <dl className="text-body grid gap-x-6 gap-y-2 sm:grid-cols-2">
        <Fact label="Court" value={booking.court.name} />
        <Fact
          label="When"
          value={`${when(booking.startsAt)}–${formatGameClock(booking.endsAt)}`}
        />
        <Fact label="Price" value={formatBookingPriceFils(booking.priceFils)} />
        <Fact
          label="Source"
          value={
            booking.source === "venue"
              ? "Made by the Venue"
              : "Booked in the app"
          }
        />
        {booking.status === "pending_payment" && booking.holdExpiresAt ? (
          <Fact label="Held until" value={when(booking.holdExpiresAt)} />
        ) : null}
        {manager.managerNotes ? (
          <Fact label="Notes" value={manager.managerNotes} />
        ) : null}
        {booking.game ? (
          <div>
            <dt className="text-muted-foreground">Game</dt>
            <dd>
              <Link
                href={`/dashboard/games/${booking.game.id}`}
                className="underline underline-offset-4"
              >
                {booking.game.name ?? "Open Game"}
              </Link>
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="space-y-1">
        <p className="text-body font-semibold">Cancellation policy</p>
        <ul className="text-body text-muted-foreground list-disc pl-5">
          {booking.cancellationPolicyLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
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
    <Section title="History">
      <ul className="text-body space-y-1">
        {entries.map((entry) => (
          <li key={`${entry.at.getTime()}-${entry.text}`}>
            <span className="text-muted-foreground">{when(entry.at)}</span>{" "}
            {entry.text}
          </li>
        ))}
      </ul>
    </Section>
  );
}
