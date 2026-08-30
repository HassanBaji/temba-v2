"use client";

import { ChevronDown, X } from "lucide-react";
import * as React from "react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

export const LOOKUP_USER_SELECT_MAX = 20;

export type LookupUserOption = {
  id: string;
  name: string;
  username: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  cue?: string | null;
};

export function LookupUserSelect({
  id,
  query,
  onQueryChange,
  options,
  selected,
  onSelectedChange,
  selection = "multiple",
  max = LOOKUP_USER_SELECT_MAX,
  pending = false,
  disabled = false,
  error = false,
  describedBy,
}: {
  id: string;
  query: string;
  onQueryChange: (query: string) => void;
  options: LookupUserOption[] | undefined;
  selected: LookupUserOption[];
  onSelectedChange: (next: LookupUserOption[]) => void;
  selection?: "multiple" | "single";
  max?: number;
  pending?: boolean;
  disabled?: boolean;
  error?: boolean;
  describedBy?: string;
}) {
  const listId = `${id}-list`;
  const rootRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const selectedIds = new Set(selected.map((row) => row.id));
  const atCap =
    selection === "multiple" ? selected.length >= max : selected.length >= 1;

  React.useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  function toggle(option: LookupUserOption) {
    if (selection === "single") {
      onSelectedChange(
        selectedIds.has(option.id) ? [] : [{ ...option, cue: option.cue }],
      );
      return;
    }

    if (selectedIds.has(option.id)) {
      onSelectedChange(selected.filter((row) => row.id !== option.id));
      return;
    }

    if (atCap) {
      return;
    }

    onSelectedChange([...selected, option]);
  }

  function remove(userId: string) {
    onSelectedChange(selected.filter((row) => row.id !== userId));
  }

  const listOptions = mergeSelectedIntoOptions(options ?? [], selected);

  return (
    <div ref={rootRef} className="space-y-3">
      {selected.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {selected.map((row) => (
            <li key={row.id}>
              <Badge variant="secondary" className="gap-1 pr-1">
                <span>{row.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${row.name}`}
                  onClick={() => remove(row.id)}
                  disabled={disabled}
                >
                  <X />
                </Button>
              </Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="relative">
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
          placeholder="Search Users"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="pr-10"
        />
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2"
        />

        {open ? (
          <div
            id={listId}
            role="listbox"
            aria-multiselectable={selection === "multiple"}
            className="border-border bg-popover absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border shadow-md"
          >
            {pending && !options ? (
              <p className="text-muted-foreground px-3 py-3 text-sm">
                Searching…
              </p>
            ) : null}
            {!pending && listOptions.length === 0 ? (
              <p className="text-muted-foreground px-3 py-3 text-sm">
                No Users match.
              </p>
            ) : null}
            {listOptions.map((option) => {
              const isSelected = selectedIds.has(option.id);
              const rowDisabled =
                disabled || (!isSelected && atCap && selection === "multiple");

              return (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={rowDisabled}
                  className={cn(
                    "hover:bg-accent hover:text-accent-foreground flex w-full items-start gap-3 px-3 py-2 text-left text-sm outline-none",
                    "focus-visible:bg-accent focus-visible:text-accent-foreground",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                  onClick={() => toggle(option)}
                >
                  {selection === "multiple" ? (
                    <Checkbox
                      checked={isSelected}
                      tabIndex={-1}
                      className="pointer-events-none mt-1"
                      aria-hidden="true"
                    />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="text-lead block font-semibold">
                      {option.name}
                    </span>
                    {option.username ? (
                      <span className="text-meta text-muted-foreground block">
                        @{option.username}
                      </span>
                    ) : null}
                    {option.email ? (
                      <span className="text-meta text-muted-foreground block">
                        {option.email}
                      </span>
                    ) : null}
                    {option.phoneNumber ? (
                      <span className="text-meta text-muted-foreground block">
                        {option.phoneNumber}
                      </span>
                    ) : null}
                    {option.cue ? (
                      <span className="text-meta text-muted-foreground block">
                        {option.cue}
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function mergeSelectedIntoOptions(
  options: LookupUserOption[],
  selected: LookupUserOption[],
) {
  const seen = new Set(options.map((row) => row.id));
  const missing = selected.filter((row) => !seen.has(row.id));
  return [...missing, ...options];
}
