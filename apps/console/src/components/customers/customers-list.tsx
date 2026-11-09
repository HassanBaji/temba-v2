"use client";

import { Search, Users } from "lucide-react";
import * as React from "react";

import { BookingMonogram } from "~/components/bookings/booking-monogram";
import { FilterSelect } from "~/components/bookings/filter-select";
import { EmptyState } from "~/components/common/empty-state";
import { ErrorState } from "~/components/common/error-state";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { cn } from "~/lib/utils";
import { api, type RouterOutputs } from "~/trpc/react";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { useLocale, useMessages } from "~/components/locale-provider";

import {
  customerCountLabel,
  customerSubtitle,
  isCustomerSort,
  lastBookingLabel,
  sortOptions,
  type CustomerSort,
} from "./customer-list-model";

type VenueCustomer =
  RouterOutputs["bookings"]["listCustomers"]["customers"][number];

const COLUMNS = ["customer", "bookings", "noShows"] as const;
const AMOUNT_COLUMNS = ["owed", "spent"] as const;

const cellClass = "px-[18px] py-3.5 align-middle";

export function CustomersList({ venueId }: { venueId: string }) {
  const m = useMessages().consoleVenue.customers;
  const locale = useLocale();
  const now = React.useMemo(() => new Date(), []);
  const [search, setSearch] = React.useState("");
  const [sort, setSort] = React.useState<CustomerSort>("lastVisit");
  const query = useDebouncedValue(search.trim(), 250);

  const list = api.bookings.listCustomers.useInfiniteQuery(
    { venueId, query: query || undefined, sort },
    {
      getNextPageParam: (page) => page.nextCursor ?? undefined,
      placeholderData: (previous) => previous,
    },
  );

  const customers = list.data?.pages.flatMap((page) => page.customers) ?? [];
  const total = list.data?.pages[0]?.total;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="border-border bg-paper rounded-control text-muted-foreground focus-within:ring-ring/50 flex h-10 w-[280px] items-center gap-2.5 border px-3 focus-within:ring-[3px]">
          <Search aria-hidden="true" className="size-[15px] shrink-0" />
          <input
            type="search"
            aria-label={m.searchLabel}
            placeholder={m.searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="text-foreground placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent text-[13px] outline-none"
          />
        </label>
        <FilterSelect
          label={m.sortLabel}
          value={sort}
          onChange={(value) => {
            if (isCustomerSort(value)) {
              setSort(value);
            }
          }}
          options={sortOptions(locale)}
        />
        {total != null ? (
          <span className="text-muted-foreground ms-auto text-[13px]">
            {customerCountLabel(total, query.length > 0, locale)}
          </span>
        ) : null}
      </div>

      {list.isLoading ? (
        <TableFrame>
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonRow key={index} />
          ))}
        </TableFrame>
      ) : list.error ? (
        <ErrorState
          title={m.loadError}
          message={list.error.message}
          onRetry={() => {
            void list.refetch();
          }}
        />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? m.noMatchTitle : m.emptyTitle}
          description={query ? m.noMatchDescription : m.emptyDescription}
        />
      ) : (
        <>
          <TableFrame>
            {customers.map((customer) => (
              <CustomerRow
                key={customer.userId ?? customer.phone}
                customer={customer}
                now={now}
              />
            ))}
          </TableFrame>
          {list.hasNextPage ? (
            <Button
              variant="outline"
              className="self-center"
              disabled={list.isFetchingNextPage}
              onClick={() => {
                void list.fetchNextPage();
              }}
            >
              {list.isFetchingNextPage ? m.loading : m.showMore}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function TableFrame({ children }: { children: React.ReactNode }) {
  const m = useMessages().consoleVenue.customers;
  return (
    <div className="border-border rounded-card overflow-hidden border">
      <table className="w-full table-fixed border-collapse text-[13px]">
        <colgroup>
          <col />
          <col className="w-[100px]" />
          <col className="w-[100px]" />
          <col className="w-[130px]" />
          <col className="w-[130px]" />
          <col className="w-[130px]" />
        </colgroup>
        <thead>
          <tr className="border-border border-b">
            {COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="eyebrow-mono px-[18px] py-3 text-start font-normal"
              >
                {m.columns[column]}
              </th>
            ))}
            {AMOUNT_COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="eyebrow-mono px-[18px] py-3 text-end font-normal"
              >
                {m.columns[column]}
              </th>
            ))}
            <th
              scope="col"
              className="eyebrow-mono px-[18px] py-3 text-start font-normal"
            >
              {m.columns.lastBooking}
            </th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CustomerRow({
  customer,
  now,
}: {
  customer: VenueCustomer;
  now: Date;
}) {
  const m = useMessages().consoleVenue.customers;
  const locale = useLocale();
  const holder =
    customer.kind === "user"
      ? { kind: "user" as const, name: customer.name, image: customer.image }
      : {
          kind: "guest" as const,
          name: customer.name,
          phone: customer.phone ?? "",
        };
  return (
    <tr className="border-border border-b last:border-b-0">
      <td className={cellClass}>
        <span className="flex items-center gap-2.5">
          <BookingMonogram holder={holder} />
          <span className="min-w-0">
            <span className="block truncate">
              {customer.name || (customer.phone ?? m.fallbackName)}
            </span>
            <span className="text-muted-foreground block truncate">
              {customerSubtitle(customer, locale)}
            </span>
          </span>
        </span>
      </td>
      <td className={cn(cellClass, "tabular-nums")}>{customer.bookingCount}</td>
      <td
        className={cn(
          cellClass,
          "tabular-nums",
          customer.noShowCount === 0 && "text-muted-foreground",
        )}
      >
        {customer.noShowCount}
      </td>
      <td
        className={cn(
          cellClass,
          "text-end tabular-nums",
          customer.owedFils === 0 ? "text-muted-foreground" : "font-semibold",
        )}
      >
        {formatBookingPriceFils(customer.owedFils, locale)}
      </td>
      <td className={cn(cellClass, "text-end tabular-nums")}>
        {formatBookingPriceFils(
          customer.paidFils - customer.refundedFils,
          locale,
        )}
      </td>
      <td className={cellClass}>
        {lastBookingLabel(customer.lastBookingAt, now, locale)}
      </td>
    </tr>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-border border-b last:border-b-0" aria-hidden="true">
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
        <Skeleton className="h-4 w-8" />
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-8" />
      </td>
      <td className={cellClass}>
        <Skeleton className="ms-auto h-4 w-16" />
      </td>
      <td className={cellClass}>
        <Skeleton className="ms-auto h-4 w-16" />
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-14" />
      </td>
    </tr>
  );
}
