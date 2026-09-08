"use client";

import { Button } from "~/components/ui/button";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  type AssignableDisplayLevelBand,
} from "~/lib/level-bands";
import { cn } from "~/lib/utils";

export const UNKNOWN_LEVEL_CHOICE = "unknown" as const;

export type LevelChoiceValue =
  | AssignableDisplayLevelBand
  | typeof UNKNOWN_LEVEL_CHOICE;

/**
 * The rungs the picker offers, sourced from the single display map in
 * `~/lib/level-bands`. PRO is absent by construction: it is the reserved elite
 * display rung and is not in `ASSIGNABLE_DISPLAY_LEVEL_BANDS`.
 */
const LEVEL_CHOICES: { value: LevelChoiceValue; label: string }[] = [
  ...ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => ({
    value: band,
    label: band,
  })),
  { value: UNKNOWN_LEVEL_CHOICE, label: "I don’t know" },
];

/**
 * The Level band choice grid, shared by the You Declare Level dialog and step
 * two of the Onboarding questionnaire so both ask the one question the same
 * way. Selection only — the caller owns the mutation.
 */
export function LevelChoiceGrid({
  id,
  value,
  onSelect,
  disabled = false,
  labelledBy,
  describedBy,
  invalid = false,
}: {
  id: string;
  value: LevelChoiceValue | "";
  onSelect: (value: LevelChoiceValue) => void;
  disabled?: boolean;
  labelledBy: string;
  describedBy?: string;
  invalid?: boolean;
}) {
  return (
    <div
      id={id}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid ? true : undefined}
      aria-describedby={describedBy}
      className="grid grid-cols-3 gap-2 sm:grid-cols-4"
    >
      {LEVEL_CHOICES.map((option) => {
        const selected = value === option.value;
        return (
          <Button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            variant={selected ? "default" : "outline"}
            className={cn(
              "min-h-11",
              option.value === UNKNOWN_LEVEL_CHOICE &&
                "col-span-3 sm:col-span-4",
            )}
            disabled={disabled}
            onClick={() => {
              onSelect(option.value);
            }}
          >
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
