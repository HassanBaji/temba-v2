"use client";

import {
  joinSideOptions,
  joinTeamOptions,
  type SideChoice,
  type SidesTeam,
} from "@repo/domain/padel-sides";
import { useLocale, useMessages } from "~/components/locale-provider";
import { cn } from "~/lib/utils";

/** A two-cell court half: the filled cell is the side, Either hatches both. */
function SideGlyph({ side, onInk }: { side: SideChoice; onInk: boolean }) {
  const filled = onInk ? "bg-paper" : "bg-ink";
  const hatched = onInk ? "hatch hatch-on-ink" : "hatch";
  const cell = (on: boolean) =>
    side === "either" ? hatched : on ? filled : "bg-transparent";
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-[20px] w-[30px] overflow-hidden rounded-[3px] border",
        onInk ? "border-paper" : "border-ink",
      )}
    >
      {/* Left and Right are court sides, so the glyph keeps its side in Arabic. */}
      <span className="flex flex-1 rtl:flex-row-reverse">
        <span className={cn("flex-1", cell(side === "left"))} />
        <span
          className={cn(
            "flex-1 border-s",
            onInk ? "border-paper" : "border-ink",
            cell(side === "right"),
          )}
        />
      </span>
    </span>
  );
}

const CARD =
  "flex min-h-[64px] w-full flex-col justify-center rounded-lg border px-3.5 py-3 text-start outline-none transition-colors focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-default";

export function TeamOptionCards({
  teams,
  value,
  disabled,
  onChange,
}: {
  teams: readonly SidesTeam[];
  value: number | null;
  disabled: boolean;
  onChange: (sideIndex: number) => void;
}) {
  const locale = useLocale();
  const options = joinTeamOptions(teams, locale);
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {options.map((option) => {
        const selected = option.sideIndex === value;
        return (
          <button
            key={option.sideIndex}
            type="button"
            aria-pressed={selected}
            disabled={disabled || !option.open}
            onClick={() => onChange(option.sideIndex)}
            className={cn(
              CARD,
              selected
                ? "border-ink bg-ink text-paper"
                : option.open
                  ? "border-rule text-ink hover:bg-muted/60"
                  : "hatch border-rule text-muted-foreground",
            )}
          >
            <span className="text-sm font-semibold">{option.name}</span>
            <span
              className={cn(
                "text-meta mt-0.5",
                selected ? "text-paper/70" : "text-muted-foreground",
              )}
            >
              {option.meta}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function SideOptionCards({
  team,
  value,
  disabled,
  onChange,
}: {
  team: SidesTeam | null;
  value: SideChoice;
  disabled: boolean;
  onChange: (side: SideChoice) => void;
}) {
  const locale = useLocale();
  const m = useMessages();
  const options = joinSideOptions(team, locale);
  return (
    <div className="grid grid-cols-3 gap-2.5">
      {options.map((option) => {
        const selected = option.side === value;
        const taken = option.takenBy != null;
        return (
          <button
            key={option.side}
            type="button"
            aria-pressed={selected}
            aria-label={
              taken
                ? m.game.sides.sideButtonTaken(
                    option.label,
                    option.takenBy ?? "",
                  )
                : m.game.sides.sideButton(option.label)
            }
            disabled={disabled || taken}
            onClick={() => onChange(option.side)}
            className={cn(
              CARD,
              "items-center gap-1.5 text-center",
              selected
                ? "border-ink bg-ink text-paper"
                : taken
                  ? "hatch border-rule text-muted-foreground"
                  : "border-rule text-ink hover:bg-muted/60",
            )}
          >
            {taken ? null : <SideGlyph side={option.side} onInk={selected} />}
            <span className="text-sm font-semibold">{option.label}</span>
            {taken ? (
              <span className="text-meta max-w-full truncate">
                {option.takenBy}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
