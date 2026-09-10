"use client";

import { ArrowLeft, Check, X } from "lucide-react";
import { useState } from "react";

import { UserAvatar } from "~/components/common/user-avatar";
import { LookupUserSelect } from "~/components/invites/lookup-user-select";
import { Button } from "~/components/ui/button";
import { Field, FieldLabel } from "~/components/ui/field";
import { FormErrorSummary } from "~/components/ui/form-error-summary";
import {
  formatGameCardDay,
  formatGameClockWithoutMeridiem,
} from "~/lib/format-game-start";
import { displayLabelFromStoredBand, type LevelBand } from "~/lib/level-bands";
import { formatPricePerPlayerCents } from "~/lib/price-per-player";
import { cn } from "~/lib/utils";
import type { LookupUserSearchRow } from "~/server/invites/search-lookup-users";
import { api, type RouterOutputs } from "~/trpc/react";

type PartnerSuggestion =
  RouterOutputs["games"]["listPartnerSuggestions"]["playedWithBefore"][number];

export type FriendlyGamePartnerPick = {
  id: string;
  name: string;
  image: string | null;
  levelBand: LevelBand | null;
  preferredPosition: "left" | "right" | null;
};

function ineligibleReason(ineligible: PartnerSuggestion["ineligible"]) {
  if (ineligible === "already_on_game") {
    return "Already in this game";
  }
  if (ineligible === "waitlisted") {
    return "On the waitlist";
  }
  if (ineligible === "level_range") {
    return "Outside this game's level range";
  }
  return null;
}

function suggestionMetaLine(row: PartnerSuggestion) {
  const ineligible = ineligibleReason(row.ineligible);
  if (ineligible) {
    return ineligible;
  }

  const bits: string[] = [];
  if (row.levelBand) {
    bits.push(displayLabelFromStoredBand(row.levelBand));
  }
  if (row.preferredPosition === "left") {
    bits.push("plays left");
  } else if (row.preferredPosition === "right") {
    bits.push("plays right");
  } else {
    bits.push("plays either side");
  }
  const head = bits.join(", ");
  if (row.gamesTogether > 0) {
    const together =
      row.gamesTogether === 1
        ? "1 game together"
        : `${row.gamesTogether} games together`;
    return `${head}. ${together}`;
  }
  return head;
}

function suggestionButtonLabel(row: PartnerSuggestion) {
  if (row.ineligible) {
    return `${row.name}. ${suggestionMetaLine(row)}`;
  }
  return `Select ${row.name}`;
}

function RecentPartnerChip({
  row,
  selected,
  onSelect,
}: {
  row: PartnerSuggestion;
  selected: boolean;
  onSelect: () => void;
}) {
  const blocked = row.ineligible != null;

  return (
    <button
      type="button"
      disabled={blocked}
      onClick={onSelect}
      aria-pressed={blocked ? undefined : selected}
      aria-label={suggestionButtonLabel(row)}
      className={cn(
        "flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-[14px] px-1 py-2",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        blocked && "hatch text-dim cursor-default",
        !blocked && selected && "bg-wash",
      )}
    >
      <span className="relative">
        <UserAvatar
          name={row.name}
          image={row.image}
          size="lg"
          className={cn("shrink-0", blocked && "opacity-50")}
        />
        {!blocked && selected ? (
          <span
            aria-hidden="true"
            className="bg-ink text-paper absolute -bottom-1 -right-1 flex size-[18px] items-center justify-center rounded-full"
          >
            <Check className="size-[10px]" strokeWidth={3} />
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          "w-full truncate text-center text-[12px] leading-tight",
          selected && !blocked ? "font-semibold" : "font-medium",
          blocked && "text-dim",
        )}
      >
        {row.name}
      </span>
    </button>
  );
}

function RecentsShowcase({
  rows,
  selectedId,
  onSelect,
}: {
  rows: PartnerSuggestion[];
  selectedId: string | null;
  onSelect: (row: PartnerSuggestion) => void;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h3 className="font-expanded text-[19px] leading-tight">
          Played with before
        </h3>
      </div>
      <div className="-mx-[22px] overflow-x-auto px-[22px]">
        <div className="flex gap-1">
          {rows.map((row) => (
            <RecentPartnerChip
              key={row.id}
              row={row}
              selected={selectedId === row.id}
              onSelect={() => onSelect(row)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PartnerSuggestionRow({
  row,
  selected,
  onSelect,
}: {
  row: PartnerSuggestion;
  selected: boolean;
  onSelect: () => void;
}) {
  const blocked = row.ineligible != null;

  return (
    <button
      type="button"
      disabled={blocked}
      onClick={onSelect}
      aria-pressed={blocked ? undefined : selected}
      aria-label={suggestionButtonLabel(row)}
      className={cn(
        "flex w-full items-center gap-3 px-[18px] py-4 text-left",
        "focus-visible:ring-ring/50 outline-none focus-visible:ring-[3px]",
        blocked && "hatch text-dim cursor-default",
        !blocked && selected && "bg-wash",
        !blocked && !selected && "bg-paper",
      )}
    >
      <UserAvatar
        name={row.name}
        image={row.image}
        size="sm"
        className="shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[15px]",
            selected && !blocked ? "font-semibold" : "font-medium",
            blocked && "text-dim",
          )}
        >
          {row.name}
        </span>
        <span
          className={cn(
            "text-meta mt-0.5 block",
            blocked ? "text-dim" : "text-muted-foreground",
          )}
        >
          {suggestionMetaLine(row)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-[22px] shrink-0 items-center justify-center rounded-full border",
          blocked && "hatch border-rule",
          !blocked && selected && "bg-ink border-ink text-paper",
          !blocked && !selected && "border-rule",
        )}
      >
        {!blocked && selected ? (
          <Check className="size-[13px]" strokeWidth={3} />
        ) : null}
      </span>
    </button>
  );
}

function SuggestionSection({
  title,
  eyebrow,
  rows,
  selectedId,
  onSelect,
}: {
  title: string;
  eyebrow: string;
  rows: PartnerSuggestion[];
  selectedId: string | null;
  onSelect: (row: PartnerSuggestion) => void;
}) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <section className="pb-4">
      <div className="flex items-baseline gap-2.5 pb-2.5">
        <h3 className="font-expanded text-[19px] leading-tight">{title}</h3>
        <p className="text-dim text-[13px]">{eyebrow}</p>
      </div>
      <div className="border-rule overflow-hidden rounded-[14px] border">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={index > 0 ? "border-rule border-t" : undefined}
          >
            <PartnerSuggestionRow
              row={row}
              selected={selectedId === row.id}
              onSelect={() => onSelect(row)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

export function FriendlyGamePartnerPicker({
  gameId,
  vacantSeatCount,
  windowStart,
  venueName,
  groupName,
  pricePerPlayerCents,
  selectedPartner,
  onSelectedPartnerChange,
  onBack,
  onClose,
  onContinue,
  notice,
}: {
  gameId: string;
  vacantSeatCount: number;
  windowStart?: Date | string | null;
  venueName?: string | null;
  groupName?: string | null;
  pricePerPlayerCents?: number | null;
  selectedPartner: FriendlyGamePartnerPick | null;
  onSelectedPartnerChange: (partner: FriendlyGamePartnerPick | null) => void;
  onBack: () => void;
  onClose: () => void;
  onContinue: () => void;
  notice?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [searchSelected, setSearchSelected] = useState<LookupUserSearchRow[]>(
    [],
  );

  const suggestions = api.games.listPartnerSuggestions.useQuery({ gameId });
  const partnerSearch = api.games.searchPartnerUsers.useQuery(
    { gameId, query },
    { enabled: true },
  );

  const start =
    windowStart == null
      ? null
      : windowStart instanceof Date
        ? windowStart
        : new Date(windowStart);
  const clock = start ? formatGameClockWithoutMeridiem(start) : null;
  const day = start ? formatGameCardDay(start) : null;
  const priceLabel = formatPricePerPlayerCents(pricePerPlayerCents);
  const seatsChip =
    vacantSeatCount === 1 ? "1 seat open" : `${vacantSeatCount} seats open`;

  function pickSuggestion(row: PartnerSuggestion) {
    if (row.ineligible) {
      return;
    }
    setSearchSelected([]);
    setQuery("");
    onSelectedPartnerChange({
      id: row.id,
      name: row.name,
      image: row.image,
      levelBand: row.levelBand,
      preferredPosition: row.preferredPosition,
    });
  }

  function pickSearch(next: LookupUserSearchRow[]) {
    setSearchSelected(next);
    const row = next[0];
    onSelectedPartnerChange(
      row
        ? {
            id: row.id,
            name: row.name,
            image: null,
            levelBand: null,
            preferredPosition: null,
          }
        : null,
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-rule shrink-0 px-[22px] pt-2">
        <div className="flex items-center justify-between">
          {/* <button
            type="button"
            onClick={onBack}
            className="border-rule text-ink focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
            aria-label="Back"
          >
            <ArrowLeft aria-hidden="true" className="size-5" strokeWidth={2} />
          </button> */}

          <button
            type="button"
            onClick={onClose}
            className="border-rule text-ink focus-visible:ring-ring/50 flex size-10 items-center justify-center rounded-[10px] border outline-none focus-visible:ring-[3px]"
            aria-label="Close"
          >
            <X aria-hidden="true" className="size-5" strokeWidth={2} />
          </button>
          <p className="text-muted-foreground text-[13px]">{seatsChip}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-[26px] overflow-y-auto overscroll-contain px-[22px]">
        <div className="border-rule mt-6 shrink-0">
          <h2 className="font-expanded text-[32px] leading-none tracking-[-0.03em]">
            Pick a partner
          </h2>
          <p className="text-meta mt-2 leading-relaxed">
            You register both seats. Your partner is in straight away.
          </p>
        </div>

        <RecentsShowcase
          rows={suggestions.data?.playedWithBefore ?? []}
          selectedId={selectedPartner?.id ?? null}
          onSelect={pickSuggestion}
        />

        <Field>
          <FieldLabel htmlFor="partner-picker-search">Search</FieldLabel>
          <LookupUserSelect
            id="partner-picker-search"
            query={query}
            onQueryChange={setQuery}
            options={partnerSearch.data}
            selected={searchSelected}
            onSelectedChange={pickSearch}
            selection="single"
            pending={partnerSearch.isFetching}
            placeholder="Search Users"
          />
        </Field>

        <SuggestionSection
          title="From your groups"
          eyebrow={groupName?.trim() ?? ""}
          rows={suggestions.data?.fromYourGroups ?? []}
          selectedId={selectedPartner?.id ?? null}
          onSelect={pickSuggestion}
        />
      </div>

      <div className="border-rule bg-background mt-[22px] flex shrink-0 flex-col gap-2.5 border-t px-[22px] pb-[max(22px,env(safe-area-inset-bottom))] pt-5">
        <Button
          type="button"
          className="h-[52px] w-full"
          disabled={!selectedPartner}
          onClick={onContinue}
        >
          {selectedPartner
            ? `Continue with ${selectedPartner.name}`
            : "Continue"}
        </Button>
        <p className="text-dim text-center text-xs leading-relaxed">
          No seat is taken until you register the team.
        </p>
      </div>
    </div>
  );
}
