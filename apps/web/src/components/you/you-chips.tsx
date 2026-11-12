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
                  ? "border-ink bg-control text-on-control"
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
