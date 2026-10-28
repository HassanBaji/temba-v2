"use client";

import { SportGlyph } from "~/components/temba/sport-glyph";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { SPORT_LABELS, SPORTS, type Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

export function SportSegments({
  value,
  onSelect,
}: {
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  return (
    <RovingRadioGroup
      aria-label="Sport"
      className="border-rule divide-rule flex divide-x overflow-hidden rounded-lg border"
    >
      {SPORTS.map((sport) => {
        const selected = sport === value;
        return (
          <button
            key={sport}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(sport)}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-11 flex-1 items-center justify-center gap-2 outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset",
              selected
                ? "bg-ink text-paper font-semibold"
                : "bg-paper text-muted-foreground hover:text-ink",
            )}
          >
            <SportGlyph sport={sport} className="size-[18px]" />
            {SPORT_LABELS[sport]}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}
