"use client";

import { useLocale } from "~/components/locale-provider";
import { ChoiceChip } from "~/components/temba/choice-chip";
import { SportGlyph } from "~/components/temba/sport-glyph";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { sportLabel, SPORTS, type Sport } from "@repo/domain/sport";

export function SportPicker({
  id,
  labelledBy,
  value,
  onChange,
  sports = SPORTS,
  disabled,
}: {
  id: string;
  labelledBy: string;
  value: Sport;
  onChange: (sport: Sport) => void;
  sports?: readonly Sport[];
  disabled?: boolean;
}) {
  const locale = useLocale();
  return (
    <RovingRadioGroup
      id={id}
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-2"
    >
      {sports.map((sport) => (
        <ChoiceChip
          key={sport}
          role="radio"
          selected={value === sport}
          disabled={disabled}
          onClick={() => onChange(sport)}
        >
          <SportGlyph sport={sport} className="size-4" />
          {sportLabel(sport, locale)}
        </ChoiceChip>
      ))}
    </RovingRadioGroup>
  );
}

export function SportCheckboxes({
  id,
  labelledBy,
  value,
  onToggle,
  disabled,
}: {
  id: string;
  labelledBy: string;
  value: readonly Sport[];
  onToggle: (sport: Sport) => void;
  disabled?: boolean;
}) {
  const locale = useLocale();
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelledBy}
      className="grid grid-cols-2 gap-2"
    >
      {SPORTS.map((sport) => (
        <ChoiceChip
          key={sport}
          role="checkbox"
          aria-checked={value.includes(sport)}
          selected={value.includes(sport)}
          disabled={disabled}
          onClick={() => onToggle(sport)}
        >
          <SportGlyph sport={sport} className="size-4" />
          {sportLabel(sport, locale)}
        </ChoiceChip>
      ))}
    </div>
  );
}
