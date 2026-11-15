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
import { useLocale, useMessages } from "~/components/locale-provider";
import {
  formatDayMonth,
  formatGameClock,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor, type Messages } from "@repo/i18n/messages";

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

function when(value: Date, locale: Locale) {
  return messagesFor(locale).consoleBookings.details.dateAndTime(
    formatDayMonth(value, locale, { weekday: "short" }),
    formatGameClock(value, locale),
  );
}

export function BookingDetails({ bookingId }: { bookingId: string }) {
  const m = useMessages().consoleBookings;
  const locale = useLocale();
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
        title={m.details.loadError}
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
        title={m.details.loadError}
        message={m.details.managersOnly}
        onRetry={() => {
          void booking.refetch();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-[22px]">
      <PageHeader
        title={bookingTitle(data, locale)}
        description={m.details.headerDescription(
          holderName(data.manager.holder, locale),
          statusText(data, locale),
        )}
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

function BookingActions({ booking }: { booking: BookingView }) {
  const m = useMessages().consoleBookings;
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
          {m.actions[key]}
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

function statusText(booking: BookingView, locale: Locale) {
  const m = messagesFor(locale).consoleBookings.details;
  if (booking.status === "pending_payment") {
    return booking.holdExpiresAt
      ? m.awaitingPaymentHeld(formatGameClock(booking.holdExpiresAt, locale))
      : m.awaitingPayment;
  }
  return booking.statusLabel;
}

function BookingFacts({ booking }: { booking: BookingView }) {
  const m = useMessages().consoleBookings.details;
  const facts = m.facts;
  const locale = useLocale();
  const manager = booking.manager!;
  const holder = manager.holder;
  return (
    <ConsoleCard>
      <ConsoleCardHeader title={m.bookingCard} />
      <dl className="divide-border divide-y text-[13px]">
        <Fact label={facts.customer}>
          <span className="flex items-center gap-2.5">
            <BookingMonogram holder={holder} />
            <span className="min-w-0">
              <span className="block truncate">
                {holderName(holder, locale)}
              </span>
              <span className="text-muted-foreground block truncate">
                {holder.kind === "guest"
                  ? holder.phone || facts.guest
                  : facts.tembaAccount}
              </span>
            </span>
          </span>
        </Fact>
        <Fact label={facts.court}>{booking.court.name}</Fact>
        <Fact label={facts.time}>
          {m.dateAndTime(
            formatDayMonth(booking.startsAt, locale, {
              weekday: "short",
              year: true,
            }),
            timeRangeLabel(booking.startsAt, booking.endsAt, locale),
          )}
        </Fact>
        <Fact label={facts.duration}>
          {durationLabel(booking.startsAt, booking.endsAt, locale)}
        </Fact>
        <Fact label={facts.price}>
          <span className="tabular-nums">
            {formatBookingPriceFils(booking.priceFils, locale)}
          </span>
        </Fact>
        <Fact label={facts.source}>{sourceLabel(booking.source, locale)}</Fact>
        <Fact label={facts.status}>{statusText(booking, locale)}</Fact>
        {manager.managerNotes ? (
          <Fact label={facts.notes}>{manager.managerNotes}</Fact>
        ) : null}
        <Fact label={facts.cancellationPolicy}>
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
  const m = useMessages().consoleBookings.details;
  const game = booking.game;
  return (
    <ConsoleCard>
      <ConsoleCardHeader title={m.gameCard} />
      <div className="px-5 py-4 text-[13px]">
        {game ? (
          <div className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate">{game.name ?? m.openGame}</span>
            {webOrigin ? (
              <a
                href={`${webOrigin}/dashboard/games/${game.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground hover:text-foreground inline-flex shrink-0 items-center gap-1.5 underline-offset-4 hover:underline"
              >
                {m.openInTemba}
                <ExternalLink aria-hidden="true" className="size-3.5" />
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground">{m.noGame}</p>
        )}
      </div>
    </ConsoleCard>
  );
}

function auditEntries(
  booking: BookingView,
  m: Messages["consoleBookings"]["details"],
  locale: Locale,
) {
  const manager = booking.manager!;
  const entries: { at: Date; text: string }[] = [
    {
      at: manager.createdAt,
      text: booking.source === "venue" ? m.createdByVenue : m.createdInApp,
    },
  ];
  if (booking.cancelledAt) {
    const parts = [
      booking.cancelledBy === "venue"
        ? m.cancelledByVenue
        : m.cancelledByCustomer,
    ];
    if (booking.refundDueFils !== null) {
      parts.push(
        m.refundDue(formatBookingPriceFils(booking.refundDueFils, locale)),
      );
    }
    if (booking.cancellationChargeFils) {
      parts.push(
        m.cancellationCharge(
          formatBookingPriceFils(booking.cancellationChargeFils, locale),
        ),
      );
    }
    if (booking.cancelReason) {
      parts.push(booking.cancelReason);
    }
    entries.push({
      at: booking.cancelledAt,
      text: parts.join(m.historySeparator),
    });
  }
  if (manager.noShowAt) {
    entries.push({ at: manager.noShowAt, text: m.markedNoShow });
  }
  return entries.sort((a, b) => a.at.getTime() - b.at.getTime());
}

function AuditTrail({ booking }: { booking: BookingView }) {
  const m = useMessages().consoleBookings.details;
  const locale = useLocale();
  const entries = auditEntries(booking, m, locale);

  return (
    <ConsoleCard>
      <ConsoleCardHeader title={m.historyCard} />
      <ol className="divide-border divide-y text-[13px]">
        {entries.map((entry) => (
          <li
            key={`${entry.at.getTime()}-${entry.text}`}
            className="grid grid-cols-[132px_1fr] gap-4 px-5 py-3"
          >
            <span className="text-muted-foreground tabular-nums">
              {when(entry.at, locale)}
            </span>
            <span>{entry.text}</span>
          </li>
        ))}
      </ol>
    </ConsoleCard>
  );
}
