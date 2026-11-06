"use client";

import { useTextDirection } from "~/components/locale-provider";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { cn } from "~/lib/utils";

export type SettingsChoice<T extends string> = {
  value: T;
  name: string;
  detail?: string;
};

const LAYOUT = {
  tiles: "flex gap-2",
  segmented: "bg-wash flex gap-1 rounded-xl p-1",
  pills: "flex flex-wrap gap-2",
} as const;

function optionClassName(
  variant: keyof typeof LAYOUT,
  selected: boolean,
  mono: boolean,
) {
  return cn(
    "focus-visible:ring-ring/50 flex min-h-11 flex-col items-center justify-center gap-0.5 text-center outline-none focus-visible:ring-[3px] aria-disabled:cursor-not-allowed aria-disabled:opacity-60",
    mono ? "font-mono text-meta uppercase" : "text-body font-semibold",
    variant === "pills"
      ? "rounded-full border px-4"
      : variant === "segmented"
        ? "min-h-[52px] flex-1 rounded-lg px-2"
        : "min-h-[52px] flex-1 rounded-xl border px-2 py-2",
    selected
      ? "border-ink bg-control text-on-control"
      : variant === "segmented"
        ? "text-muted-foreground hover:text-ink"
        : "border-rule bg-paper text-ink hover:bg-wash",
  );
}

/** One choice from a few: equal tiles, a segmented bar, or pills. */
export function SettingsChoices<T extends string>({
  label,
  labelledBy,
  describedBy,
  choices,
  value,
  onSelect,
  variant = "tiles",
  mono = false,
  disabled = false,
  physical = false,
  id,
}: {
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  choices: readonly SettingsChoice<T>[];
  value: T | null;
  onSelect: (value: T) => void;
  variant?: keyof typeof LAYOUT;
  mono?: boolean;
  disabled?: boolean;
  /** The choices are court sides, so their order stays left to right in Arabic. */
  physical?: boolean;
  id?: string;
}) {
  const { direction } = useTextDirection();
  return (
    <RovingRadioGroup
      id={id}
      dir={physical ? "ltr" : undefined}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      aria-disabled={disabled || undefined}
      className={LAYOUT[variant]}
    >
      {choices.map((choice) => {
        const selected = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled || undefined}
            onClick={() => {
              if (!disabled && !selected) {
                onSelect(choice.value);
              }
            }}
            className={optionClassName(variant, selected, mono)}
            dir={physical ? direction : undefined}
          >
            <span>{choice.name}</span>
            {choice.detail ? (
              <span
                className={cn(
                  "text-eyebrow font-sans font-normal normal-case",
                  selected ? "text-dim" : "text-muted-foreground",
                )}
              >
                {choice.detail}
              </span>
            ) : null}
          </button>
        );
      })}
    </RovingRadioGroup>
  );
}
