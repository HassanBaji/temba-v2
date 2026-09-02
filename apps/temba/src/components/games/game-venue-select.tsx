"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Input } from "~/components/ui/input";
import {
  filterVenuesForSelect,
  venueMatchingQuery,
  venueOptionLabel,
  type VenueSelectOption,
} from "~/lib/game-venue-select";
import { cn } from "~/lib/utils";

export function GameVenueSelect({
  id,
  venues,
  value,
  onValueChange,
  disabled = false,
  pending = false,
  error = false,
  describedBy,
  placeholder = "Select a Venue",
}: {
  id: string;
  venues: VenueSelectOption[];
  value: string;
  onValueChange: (venueId: string) => void;
  disabled?: boolean;
  pending?: boolean;
  error?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const listId = `${id}-list`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const selectedVenue = venues.find((venue) => venue.id === value);
  const selectedLabel = selectedVenue
    ? venueOptionLabel(selectedVenue)
    : undefined;

  React.useEffect(() => {
    if (open) {
      return;
    }
    if (!selectedLabel) {
      if (!value) {
        setQuery("");
      }
      return;
    }
    setQuery(selectedLabel);
  }, [open, selectedLabel, value]);

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        if (selectedLabel) {
          setQuery(selectedLabel);
        }
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open, selectedLabel]);

  const filtered = filterVenuesForSelect(venues, query, selectedLabel);

  function selectVenue(venue: VenueSelectOption) {
    if (venue.id !== value) {
      onValueChange(venue.id);
    }
    setQuery(venueOptionLabel(venue));
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          const match = venueMatchingQuery(venues, nextQuery);
          if (match && match.id !== value) {
            onValueChange(match.id);
          }
        }}
        onFocus={(event) => {
          if (disabled) {
            return;
          }
          setOpen(true);
          event.target.select();
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            setOpen(false);
            if (selectedLabel) {
              setQuery(selectedLabel);
            }
            return;
          }
          if (event.key === "Enter" && open) {
            const browsingSelected =
              selectedLabel !== undefined && query.trim() === selectedLabel;
            if (browsingSelected) {
              setOpen(false);
              return;
            }
            const first = filtered[0];
            if (first) {
              event.preventDefault();
              selectVenue(first);
            }
          }
        }}
        className="pr-10"
      />
      <ChevronDown
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
      />

      {open && !disabled ? (
        <div
          id={listId}
          role="listbox"
          className="border-border bg-popover absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-md"
        >
          {pending && venues.length === 0 ? (
            <p className="text-muted-foreground px-3 py-3 text-sm">Loading…</p>
          ) : null}
          {!pending && filtered.length === 0 ? (
            <p className="text-muted-foreground px-3 py-3 text-sm">
              {venues.length === 0 ? "No live Venues." : "No Venues match."}
            </p>
          ) : null}
          {filtered.map((venue) => {
            const isSelected = venue.id === value;
            return (
              <button
                key={venue.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "hover:bg-accent hover:text-accent-foreground flex w-full px-3 py-2 text-left text-sm outline-none",
                  "focus-visible:bg-accent focus-visible:text-accent-foreground",
                  isSelected && "bg-accent text-accent-foreground",
                )}
                onClick={() => selectVenue(venue)}
              >
                {venueOptionLabel(venue)}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
