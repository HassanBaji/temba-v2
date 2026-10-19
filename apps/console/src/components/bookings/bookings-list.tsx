"use client";

import { CalendarDays, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { SegmentedControl } from "~/components/console/segmented-control";
import { Skeleton } from "~/components/ui/skeleton";
import { bookingPath } from "~/lib/console-paths";
import { api } from "~/trpc/react";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDayKey } from "@repo/domain/product-timezone";
import { cn } from "~/lib/utils";

import {
  countLabel,
  durationLabel,
  inScope,
  matchesSearch,
  SCOPE_OPTIONS,
  scopeQuery,
  sourceLabel,
  whenLabel,
  type ListScope,
} from "./booking-list-model";
import { BookingMonogram } from "./booking-monogram";
import { BookingRowMenu } from "./booking-row-menu";
import { holderName, type VenueBooking } from "./booking-types";
import { FilterSelect } from "./filter-select";
import { PaymentBadge } from "./payment-badge";

const SOURCE_OPTIONS = [
  { value: "", label: "Any source" },
  { value: "app", label: "App" },
  { value: "venue", label: "Manual" },
] as const;

const COLUMNS = ["When", "Customer", "Court", "Game", "Source", "Payment"];

const webOrigin = process.env.NEXT_PUBLIC_WEB_ORIGIN;

export function BookingsList({
  venueId,
  courts,
}: {
  venueId: string;
  courts: readonly { id: string; name: string }[];
}) {
  const router = useRouter();
  const now = React.useMemo(() => new Date(), []);
  const today = React.useMemo(() => productDayKey(now), [now]);
  const [scope, setScope] = React.useState<ListScope>("upcoming");
  const [search, setSearch] = React.useState("");
  const [courtId, setCourtId] = React.useState("");
  const [source, setSource] = React.useState("");

  const query = scopeQuery(scope, today);
  const list = api.bookings.listForVenue.useQuery({
    venueId,
    from: query.from,
    to: query.to,
    status: query.status,
    courtId: courtId || undefined,
    source: source ? [source as "app" | "venue"] : undefined,
  });

  const rows = React.useMemo(() => {
    const all = list.data?.bookings ?? [];
    const scoped = all.filter((booking) => inScope(booking, scope, now));
    const ordered =
      scope === "upcoming"
        ? scoped
        : [...scoped].sort(
            (a, b) => b.startsAt.getTime() - a.startsAt.getTime(),
          );
    return ordered.filter((booking) => matchesSearch(booking, search));
  }, [list.data, scope, now, search]);

  const courtOptions = [
    { value: "", label: "All courts" },
    ...courts.map((court) => ({ value: court.id, label: court.name })),
  ];

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="border-border bg-paper rounded-control text-muted-foreground focus-within:ring-ring/50 flex h-10 w-[280px] items-center gap-2.5 border px-3 focus-within:ring-[3px]">
          <Search aria-hidden="true" className="size-[15px] shrink-0" />
          <input
            type="search"
            aria-label="Search Bookings"
            placeholder="Name, phone or booking ref"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="text-foreground placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent text-[13px] outline-none"
          />
        </label>
        <SegmentedControl
          label="Which Bookings"
          value={scope}
          options={SCOPE_OPTIONS}
          onChange={setScope}
        />
        <FilterSelect
          label="Court"
          value={courtId}
          onChange={setCourtId}
          options={courtOptions}
        />
        <FilterSelect
          label="Source"
          value={source}
          onChange={setSource}
          options={SOURCE_OPTIONS}
        />
        {list.data ? (
          <span className="text-muted-foreground ml-auto text-[13px]">
            {countLabel(scope, rows.length)}
          </span>
        ) : null}
      </div>

      {list.isLoading ? (
        <TableFrame>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <SkeletonRow key={index} />
            ))}
          </tbody>
        </TableFrame>
      ) : list.error ? (
        <ErrorState
          title="Bookings could not be loaded"
          message={list.error.message}
          onRetry={() => {
            void list.refetch();
          }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title={
            search.trim() ? "No Bookings match" : "Nothing on the books here"
          }
          description={
            search.trim()
              ? "Try another name, phone or booking reference."
              : "Change the court, source or period to see more."
          }
        />
      ) : (
        <TableFrame>
          <tbody>
            {rows.map((booking) => (
              <BookingRow
                key={booking.id}
                venueId={venueId}
                booking={booking}
                now={now}
                onOpen={() => router.push(bookingPath(venueId, booking.id))}
              />
            ))}
          </tbody>
        </TableFrame>
      )}
    </div>
  );
}

function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border rounded-card overflow-hidden border">
      <table className="w-full table-fixed border-collapse text-[13px]">
        <colgroup>
          <col className="w-[132px]" />
          <col />
          <col className="w-[100px]" />
          <col className="w-[14%]" />
          <col className="w-[100px]" />
          <col className="w-[130px]" />
          <col className="w-[100px]" />
          <col className="w-[52px]" />
        </colgroup>
        <thead>
          <tr className="border-border border-b">
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="eyebrow-mono px-[18px] py-3 text-left font-normal"
              >
                {column}
              </th>
            ))}
            <th
              scope="col"
              className="eyebrow-mono px-[18px] py-3 text-right font-normal"
            >
              Amount
            </th>
            <th scope="col" className="px-[18px] py-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        {children}
      </table>
    </div>
  );
}

const cellClass = "px-[18px] py-3.5 align-middle";

function BookingRow({
  venueId,
  booking,
  now,
  onOpen,
}: {
  venueId: string;
  booking: VenueBooking;
  now: Date;
  onOpen: () => void;
}) {
  const holder = booking.holder;
  const pending = booking.status === "pending_payment";
  return (
    <tr
      onClick={onOpen}
      className={cn(
        "border-border hover:bg-wash cursor-pointer border-b transition-colors last:border-b-0",
        booking.status === "cancelled" || booking.status === "expired"
          ? "text-muted-foreground"
          : null,
      )}
    >
      <td className={cn(cellClass, "pl-[18px]")}>
        <Link
          href={bookingPath(venueId, booking.id)}
          onClick={(event) => event.stopPropagation()}
          className="focus-visible:ring-ring/50 block rounded-sm font-semibold outline-none focus-visible:ring-[3px]"
        >
          {whenLabel(booking.startsAt, now)}
        </Link>
        <span className="text-muted-foreground block">
          {durationLabel(booking.startsAt, booking.endsAt)}
          {pending ? " · awaiting payment" : null}
        </span>
      </td>
      <td className={cellClass}>
        <span className="flex items-center gap-2.5">
          <BookingMonogram holder={holder} />
          <span className="min-w-0">
            <span className="block truncate">{holderName(holder)}</span>
            {holder.kind === "guest" && holder.phone ? (
              <span className="text-muted-foreground block truncate">
                {holder.phone}
              </span>
            ) : null}
          </span>
        </span>
      </td>
      <td className={cn(cellClass, "truncate")}>{booking.courtName}</td>
      <td className={cellClass}>
        {booking.gameId ? (
          webOrigin ? (
            <a
              href={`${webOrigin}/dashboard/games/${booking.gameId}`}
              target="_blank"
              rel="noreferrer"
              onClick={(event) => event.stopPropagation()}
              className="underline-offset-4 hover:underline"
            >
              Game
            </a>
          ) : (
            "Game"
          )
        ) : (
          <span className="text-muted-foreground/70">None</span>
        )}
      </td>
      <td className={cellClass}>{sourceLabel(booking.source)}</td>
      <td className={cellClass}>
        <PaymentBadge status={booking.paymentStatus} />
      </td>
      <td className={cn(cellClass, "text-right tabular-nums")}>
        {formatBookingPriceFils(booking.priceFils)}
      </td>
      <td className={cn(cellClass, "pr-3")}>
        <BookingRowMenu venueId={venueId} booking={booking} />
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-border border-b last:border-b-0" aria-hidden="true">
      <td className={cellClass}>
        <Skeleton className="h-4 w-24" />
        <Skeleton className="mt-1.5 h-3 w-12" />
      </td>
      <td className={cellClass}>
        <span className="flex items-center gap-2.5">
          <Skeleton className="size-7 rounded-[7px]" />
          <span>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-1.5 h-3 w-24" />
          </span>
        </span>
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-14" />
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-20" />
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-10" />
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-14" />
      </td>
      <td className={cellClass}>
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
      <td className={cellClass} />
    </tr>
  );
}
