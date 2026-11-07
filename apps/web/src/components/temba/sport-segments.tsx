"use client";

import { useLocale, useMessages } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { sportLabel, SPORTS, type Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

export function SportSegments({
  value,
  onSelect,
}: {
  value: Sport;
  onSelect: (sport: Sport) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={m.webUi.sport}
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
                ? "bg-control text-on-control font-semibold"
                : "bg-paper text-muted-foreground hover:text-ink",
            )}
          >
            <SportGlyph sport={sport} className="size-[18px]" />
            {sportLabel(sport, locale)}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}
