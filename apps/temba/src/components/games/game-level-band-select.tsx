"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { LEVEL_BANDS } from "~/lib/level-bands";
import {
  isLevelBand,
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "~/lib/level-range";

export function GameLevelBandSelect({
  id,
  value,
  onValueChange,
  invalid,
  describedBy,
}: {
  id: string;
  value: LevelBandSelectValue;
  onValueChange: (value: LevelBandSelectValue) => void;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (next === LEVEL_BAND_SELECT_NONE || isLevelBand(next)) {
          onValueChange(next);
        }
      }}
    >
      <SelectTrigger
        id={id}
        className="w-full"
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      >
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={LEVEL_BAND_SELECT_NONE}>None</SelectItem>
        {LEVEL_BANDS.map((band) => (
          <SelectItem key={band} value={band}>
            {band}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
