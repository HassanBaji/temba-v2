import {
  LEVEL_BAND_SELECT_NONE,
  type LevelBandSelectValue,
} from "@repo/domain/level-range";

export type LevelRangeSummary = {
  minimum: string;
  maximum: string;
  open: boolean;
};

const UNSET_BOUND = "Any";

export function levelRangeSummary(
  min: LevelBandSelectValue,
  max: LevelBandSelectValue,
): LevelRangeSummary {
  return {
    minimum: min === LEVEL_BAND_SELECT_NONE ? UNSET_BOUND : min,
    maximum: max === LEVEL_BAND_SELECT_NONE ? UNSET_BOUND : max,
    open: min === LEVEL_BAND_SELECT_NONE && max === LEVEL_BAND_SELECT_NONE,
  };
}
