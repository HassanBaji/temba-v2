import type { Palette } from "@repo/design-tokens";
import type { SeriesBadgeSurface } from "@repo/design-tokens/series";

import { tonePalette } from "../primitives/tone-palette";

/**
 * The count pill on a surface: the fill is what the surface's tone writes
 * with, the digits are what it writes on, and the ring is the surface itself.
 * On the focused surface that follows the ink tone, so the pill stands off it
 * whichever way the focus is drawn (ADR-0084).
 */
export function seriesBadgeCountColors(
  surface: SeriesBadgeSurface,
  colors: Palette,
) {
  const tone = tonePalette(surface === "focus" ? "ink" : "paper", colors);
  return {
    fill: tone.foreground,
    digits: tone.background,
    ring: colors[surface],
  };
}
