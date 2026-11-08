"use client";

import { Button } from "~/components/ui/button";

export type ChallengeChip<T extends string | number> = {
  value: T;
  label: string;
  disabled?: boolean;
  accessibilityLabel?: string;
};

/** A row of pressable chips; one pick or several. */
export function ChallengeChips<T extends string | number>({
  label,
  chips,
  isSelected,
  onSelect,
  id,
}: {
  label: string;
  chips: readonly ChallengeChip<T>[];
  isSelected: (value: T) => boolean;
  onSelect: (value: T) => void;
  id?: string;
}) {
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-2"
    >
      {chips.map((chip) => {
        const selected = isSelected(chip.value);
        return (
          <Button
            key={String(chip.value)}
            type="button"
            size="sm"
            variant={selected ? "default" : "outline"}
            aria-pressed={selected}
            aria-label={chip.accessibilityLabel}
            disabled={chip.disabled}
            onClick={() => onSelect(chip.value)}
          >
            {chip.label}
          </Button>
        );
      })}
    </div>
  );
}
