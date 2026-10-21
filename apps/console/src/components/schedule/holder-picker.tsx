"use client";

import { Search, X } from "lucide-react";
import { useState } from "react";

import { PersonMonogram } from "~/components/staff/person-monogram";
import { Input } from "~/components/ui/input";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { api, type RouterOutputs } from "~/trpc/react";

import { guestFromQuery, type HolderDraft } from "./new-booking-model";

type CustomerMatch = RouterOutputs["bookings"]["searchCustomers"][number];

const MIN_QUERY_LENGTH = 2;

const fieldClass = "rounded-control h-10 min-h-10 text-[13px] shadow-none";

function matchDetail(match: CustomerMatch): string {
  const visits =
    match.bookingCount === 0
      ? null
      : `${match.bookingCount} ${match.bookingCount === 1 ? "booking" : "bookings"}`;
  if (match.kind === "guest") {
    return [match.phone, visits ?? "Guest"].join(", ");
  }
  return (
    [match.phone, visits].filter(Boolean).join(", ") ||
    (match.username ? `@${match.username}` : "Temba player")
  );
}

export function HolderPicker({
  venueId,
  holder,
  onChange,
}: {
  venueId: string;
  holder: HolderDraft;
  onChange: (holder: HolderDraft) => void;
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);
  const searching =
    holder.kind === "none" && debouncedQuery.length >= MIN_QUERY_LENGTH;
  const search = api.bookings.searchCustomers.useQuery(
    { venueId, query: debouncedQuery },
    { enabled: searching },
  );

  if (holder.kind === "user") {
    return (
      <div className="border-border rounded-control flex h-12 items-center gap-2.5 border px-3 text-[13px]">
        <PersonMonogram name={holder.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{holder.name}</span>
          <span className="text-muted-foreground block truncate text-xs">
            {holder.detail ?? "Temba player"}
          </span>
        </span>
        <ClearButton onClick={() => onChange({ kind: "none" })} />
      </div>
    );
  }

  if (holder.kind === "guest") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">New customer</span>
          <button
            type="button"
            onClick={() => onChange({ kind: "none" })}
            className="text-ink text-xs font-semibold underline-offset-2 hover:underline"
          >
            Search instead
          </button>
        </div>
        <Input
          aria-label="Customer name"
          placeholder="Name"
          value={holder.name}
          maxLength={255}
          autoComplete="off"
          className={fieldClass}
          onChange={(event) =>
            onChange({ ...holder, name: event.target.value })
          }
        />
        <Input
          aria-label="Customer phone"
          placeholder="Phone"
          type="tel"
          value={holder.phone}
          maxLength={32}
          autoComplete="off"
          className={fieldClass}
          onChange={(event) =>
            onChange({ ...holder, phone: event.target.value })
          }
        />
      </div>
    );
  }

  const matches = searching ? (search.data ?? []) : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-[15px] -translate-y-1/2"
        />
        <Input
          aria-label="Search Customers"
          placeholder="Name or phone"
          value={query}
          maxLength={100}
          autoComplete="off"
          className={`${fieldClass} pl-9 pr-[118px]`}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          type="button"
          onClick={() => onChange({ kind: "guest", ...guestFromQuery(query) })}
          className="border-border hover:bg-wash rounded-block absolute right-1.5 top-1/2 h-7 -translate-y-1/2 border px-2.5 text-xs font-semibold transition-colors"
        >
          New customer
        </button>
      </div>

      <div aria-live="polite">
        {searching && search.isLoading ? (
          <p className="text-muted-foreground text-xs">Searching…</p>
        ) : null}
        {search.error && searching ? (
          <p role="alert" className="text-destructive text-xs">
            {search.error.message}
          </p>
        ) : null}
        {searching && search.data && matches.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            No one found. Add them as a new customer.
          </p>
        ) : null}
        {matches.length > 0 ? (
          <ul className="border-border divide-border rounded-block max-h-56 divide-y overflow-y-auto border text-[13px]">
            {matches.map((match) => (
              <li key={match.kind === "user" ? match.userId : match.phone}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    onChange(
                      match.kind === "user"
                        ? {
                            kind: "user",
                            userId: match.userId,
                            name: match.name,
                            detail: matchDetail(match),
                          }
                        : {
                            kind: "guest",
                            name: match.name,
                            phone: match.phone,
                          },
                    );
                  }}
                  className="hover:bg-wash flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
                >
                  <PersonMonogram
                    name={match.name}
                    image={match.kind === "user" ? match.image : null}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">
                      {match.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {matchDetail(match)}
                    </span>
                  </span>
                  {match.kind === "user" ? (
                    <span className="border-border rounded-[4px] border px-1.5 py-0.5 text-[10px] font-semibold uppercase">
                      Temba
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

function ClearButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Change Customer"
      className="text-muted-foreground hover:bg-wash hover:text-ink rounded-block flex size-7 shrink-0 items-center justify-center transition-colors"
    >
      <X aria-hidden="true" className="size-3.5" />
    </button>
  );
}
