import { LEVEL_BANDS, type LevelBand } from "./level";

/**
 * The Level band a Guest player shows and is balanced at: the mean band of
 * the other players in the Game who have one. Null when none do.
 */
export function guestStandInBand(
  bands: readonly (LevelBand | null)[],
): LevelBand | null {
  const known = bands.filter((band): band is LevelBand => band != null);
  if (known.length === 0) {
    return null;
  }
  const mean =
    known.reduce((sum, band) => sum + LEVEL_BANDS.indexOf(band), 0) /
    known.length;
  return LEVEL_BANDS[Math.round(mean)] ?? null;
}
