"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  isAssignableDisplayLevelBand,
} from "@repo/domain/level-bands";
import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";
import { useMessages } from "~/components/locale-provider";

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
  const m = useMessages();
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (
          next === LEVEL_BAND_SELECT_NONE ||
          isAssignableDisplayLevelBand(next)
        ) {
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
        <SelectValue placeholder={m.common.none} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={LEVEL_BAND_SELECT_NONE}>{m.common.none}</SelectItem>
        {ASSIGNABLE_DISPLAY_LEVEL_BANDS.map((band) => (
          <SelectItem key={band} value={band}>
            <bdi dir="ltr">{band}</bdi>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
