"use client";

import * as React from "react";

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "~/components/ui/combobox";
import type { LookupUserSearchRow } from "~/server/invites/search-lookup-users";

export const LOOKUP_USER_SELECT_MAX = 20;

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
  placeholder = "Search Users",
}: {
  id: string;
  query: string;
  onQueryChange: (query: string) => void;
  options: LookupUserSearchRow[] | undefined;
  selected: LookupUserSearchRow[];
  onSelectedChange: (next: LookupUserSearchRow[]) => void;
  selection?: "multiple" | "single";
  max?: number;
  pending?: boolean;
  disabled?: boolean;
  error?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const anchor = useComboboxAnchor();
  const [container, setContainer] = React.useState<HTMLElement | null>(null);
  const selectedIds = new Set(selected.map((row) => row.id));
  const listOptions = mergeSelectedIntoOptions(options ?? [], selected);
  const atCap =
    selection === "multiple" ? selected.length >= max : selected.length >= 1;

  React.useLayoutEffect(() => {
    const node = anchor.current;
    if (!node) {
      return;
    }
    setContainer(
      node.closest(
        "[data-slot=responsive-dialog-content], [data-slot=dialog-content], [data-slot=drawer-content]",
      ) ?? null,
    );
  }, [anchor]);

  return (
    <Combobox
      multiple
      autoHighlight
      disabled={disabled}
      items={listOptions}
      filteredItems={listOptions}
      value={selected}
      inputValue={query}
      filter={null}
      itemToStringLabel={(item) => item.name}
      itemToStringValue={(item) => item.id}
      isItemEqualToValue={(item, value) => item.id === value.id}
      onValueChange={(next) => {
        if (selection === "single") {
          onSelectedChange(next.slice(-1));
          return;
        }
        if (next.length > max) {
          return;
        }
        onSelectedChange(next);
      }}
      onInputValueChange={onQueryChange}
    >
      <ComboboxChips ref={anchor} className="w-full">
        <ComboboxValue>
          {selected.map((row) => (
            <ComboboxChip key={row.id}>{row.name}</ComboboxChip>
          ))}
        </ComboboxValue>
        <ComboboxChipsInput
          id={id}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          aria-invalid={error || undefined}
          aria-describedby={describedBy}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor} container={container ?? undefined}>
        <ComboboxEmpty>
          {pending && !options ? "Searching…" : "No Users match."}
        </ComboboxEmpty>
        <ComboboxList>
          {(option: LookupUserSearchRow) => {
            const isSelected = selectedIds.has(option.id);
            return (
              <ComboboxItem
                key={option.id}
                value={option}
                disabled={selection === "multiple" && !isSelected && atCap}
                className="items-start py-2"
              >
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
                    <span className="text-muted-foreground text-meta block">
                      {option.cue}
                    </span>
                  ) : null}
                </span>
              </ComboboxItem>
            );
          }}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

function mergeSelectedIntoOptions(
  options: LookupUserSearchRow[],
  selected: LookupUserSearchRow[],
) {
  const seen = new Set(options.map((row) => row.id));
  const missing = selected.filter((row) => !seen.has(row.id));
  return [...missing, ...options];
}
