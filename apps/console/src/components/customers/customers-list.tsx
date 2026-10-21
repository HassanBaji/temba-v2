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

import {
  customerCountLabel,
  customerSubtitle,
  isCustomerSort,
  lastBookingLabel,
  SORT_OPTIONS,
  type CustomerSort,
} from "./customer-list-model";

type VenueCustomer =
  RouterOutputs["bookings"]["listCustomers"]["customers"][number];

const COLUMNS = ["Customer", "Bookings", "No-shows"];
const AMOUNT_COLUMNS = ["Owed", "Spent"];

const cellClass = "px-[18px] py-3.5 align-middle";

export function CustomersList({ venueId }: { venueId: string }) {
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
            aria-label="Search Customers"
            placeholder="Name, username or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="text-foreground placeholder:text-muted-foreground h-full w-full min-w-0 bg-transparent text-[13px] outline-none"
          />
        </label>
        <FilterSelect
          label="Sort Customers"
          value={sort}
          onChange={(value) => {
            if (isCustomerSort(value)) {
              setSort(value);
            }
          }}
          options={SORT_OPTIONS}
        />
        {total != null ? (
          <span className="text-muted-foreground ml-auto text-[13px]">
            {customerCountLabel(total, query.length > 0)}
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
          title="Customers could not be loaded"
          message={list.error.message}
          onRetry={() => {
            void list.refetch();
          }}
        />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title={query ? "No Customers match" : "No Customers yet"}
          description={
            query
              ? "Try another name, username or phone."
              : "Anyone who books here, in the app or at the desk, appears in this list."
          }
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
              {list.isFetchingNextPage ? "Loading…" : "Show more"}
            </Button>
          ) : null}
        </>
      )}
    </div>
  );
}

function TableFrame({ children }: { children: React.ReactNode }) {
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
                className="eyebrow-mono px-[18px] py-3 text-left font-normal"
              >
                {column}
              </th>
            ))}
            {AMOUNT_COLUMNS.map((column) => (
              <th
                key={column}
                scope="col"
                className="eyebrow-mono px-[18px] py-3 text-right font-normal"
              >
                {column}
              </th>
            ))}
            <th
              scope="col"
              className="eyebrow-mono px-[18px] py-3 text-left font-normal"
            >
              Last booking
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
              {customer.name || (customer.phone ?? "Customer")}
            </span>
            <span className="text-muted-foreground block truncate">
              {customerSubtitle(customer)}
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
          "text-right tabular-nums",
          customer.owedFils === 0 ? "text-muted-foreground" : "font-semibold",
        )}
      >
        {formatBookingPriceFils(customer.owedFils)}
      </td>
      <td className={cn(cellClass, "text-right tabular-nums")}>
        {formatBookingPriceFils(customer.paidFils - customer.refundedFils)}
      </td>
      <td className={cellClass}>
        {lastBookingLabel(customer.lastBookingAt, now)}
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
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
      <td className={cellClass}>
        <Skeleton className="ml-auto h-4 w-16" />
      </td>
      <td className={cellClass}>
        <Skeleton className="h-4 w-14" />
      </td>
    </tr>
  );
}
