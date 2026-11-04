"use client";

import { Plus } from "lucide-react";
import Link from "next/link";

import { useMessages } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";
import { SPORTS, type Sport } from "@repo/domain/sport";

export const SPORT_SETTINGS_HREF: Record<Sport, string> = {
  padel: "/dashboard/you/settings/padel",
  football: "/dashboard/you/settings/football",
};

const chipClassName =
  "focus-visible:ring-ring/50 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-body outline-none focus-visible:ring-[3px]";

/** The sports the User set up, and a dashed chip to add the other one. */
export function SportChips({
  sports,
  value,
  onSelect,
}: {
  sports: readonly Sport[];
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  const others = SPORTS.filter((sport) => !sports.includes(sport));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <RovingRadioGroup
        aria-label={m.webYou.sportsLabel}
        className="flex items-center gap-2"
      >
        {sports.map((sport) => {
          const selected = sport === value;
          return (
            <button
              key={sport}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onSelect(sport)}
              className={cn(
                chipClassName,
                "font-semibold",
                selected
                  ? "border-ink bg-ink text-paper"
                  : "border-rule bg-paper text-ink hover:bg-wash",
              )}
            >
              {m.common[sport]}
            </button>
          );
        })}
      </RovingRadioGroup>
      {others.map((sport) => (
        <Link
          key={sport}
          href={SPORT_SETTINGS_HREF[sport]}
          aria-label={m.you.header.addSport(m.common[sport])}
          className={cn(
            chipClassName,
            "border-rule text-muted-foreground hover:text-ink hover:bg-wash border-dashed",
          )}
        >
          <Plus aria-hidden="true" className="size-4" strokeWidth={2} />
          {m.common[sport]}
        </Link>
      ))}
    </div>
  );
}

export type ScopeChip = { key: string; name: string; band: string };

/** General, then one chip per Group Level; scrolls sideways when they overflow. */
export function ScopeChips({
  chips,
  value,
  onSelect,
}: {
  chips: readonly ScopeChip[];
  value: string;
  onSelect: (key: string) => void;
}) {
  const m = useMessages();

  return (
    <RovingRadioGroup
      aria-label={m.webYou.scopesLabel}
      className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
    >
      {chips.map((chip) => {
        const selected = chip.key === value;
        return (
          <button
            key={chip.key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={m.you.scope.chipSpoken(chip.name, chip.band)}
            onClick={() => onSelect(chip.key)}
            className={cn(
              "focus-visible:ring-ring/50 text-meta inline-flex min-h-9 max-w-[220px] shrink-0 items-center gap-1.5 rounded-lg border px-3 outline-none focus-visible:ring-[3px]",
              selected
                ? "border-ink bg-ink text-paper"
                : "border-rule bg-paper text-ink hover:bg-wash",
            )}
          >
            <span className="truncate">{chip.name}</span>
            <span
              aria-hidden="true"
              dir="ltr"
              className={cn(
                "font-mono text-[10px]",
                selected ? "text-dim" : "text-muted-foreground",
              )}
            >
              {chip.band}
            </span>
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}
