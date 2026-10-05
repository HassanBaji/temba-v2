import { ChoiceChip } from "~/components/temba/choice-chip";
import { RovingRadioGroup } from "~/components/ui/roving-radio-group";
import { isLevelBoundDisabled } from "@repo/domain/create-game-flow";
import { ASSIGNABLE_DISPLAY_LEVEL_BANDS } from "@repo/domain/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";

export function LevelBandRow({
  id,
  label,
  bound,
  value,
  other,
  invalid,
  describedBy,
  onSelect,
}: {
  id: string;
  label: string;
  bound: "min" | "max";
  value: LevelBandSelectValue;
  other: LevelBandSelectValue;
  invalid: boolean;
  describedBy?: string;
  onSelect: (band: LevelBandSelectValue) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p id={`${id}-label`} className="text-muted-foreground text-meta">
        {label}
      </p>
      <RovingRadioGroup
        id={id}
        aria-labelledby={`${id}-label`}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        tabIndex={-1}
        className="grid grid-cols-4 gap-1.5 outline-none sm:grid-cols-7"
      >
        {ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => (
          <ChoiceChip
            key={band}
            role="radio"
            selected={value === band}
            disabled={isLevelBoundDisabled(bound, band, other)}
            onClick={() => {
              onSelect(value === band ? LEVEL_BAND_SELECT_NONE : band);
            }}
          >
            {band}
          </ChoiceChip>
        ))}
      </RovingRadioGroup>
    </div>
  );
}
