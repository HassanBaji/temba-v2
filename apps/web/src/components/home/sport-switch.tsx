"use client";

import { useMessages } from "~/components/locale-provider";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import type { SportSwitchLevel } from "@repo/domain/ratings-screen";
import type { Sport } from "@repo/domain/sport";
import { cn } from "~/lib/utils";

/**
 * A track with a solid thumb; each side shows the sport and its Level: the
 * band on padel, the number on football.
 */
export function SportSwitch({
  sports,
  value,
  levels,
  onSelect,
}: {
  sports: readonly Sport[];
  value: Sport;
  levels: Partial<Record<Sport, SportSwitchLevel | null>>;
  onSelect: (sport: Sport) => void;
}) {
  const m = useMessages();
  return (
    <RovingRadioGroup
      aria-label={m.webUi.sport}
      className="bg-wash flex gap-1 rounded-[14px] p-1"
    >
      {sports.map((sport) => {
        const selected = sport === value;
        const level = levels[sport] ?? null;
        return (
          <button
            key={sport}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={level ? level.spoken : m.common[sport]}
            onClick={() => onSelect(sport)}
            className={cn(
              "focus-visible:ring-ring/50 flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg outline-none transition-colors focus-visible:ring-[3px]",
              selected
                ? "bg-ink text-paper font-semibold"
                : "text-muted-foreground hover:text-ink",
            )}
          >
            <SportGlyph sport={sport} className="size-4" />
            {m.common[sport]}
            {level ? (
              <span
                dir="ltr"
                className={cn(
                  "font-expanded text-meta",
                  selected && "opacity-60",
                )}
              >
                {level.label}
              </span>
            ) : null}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}
