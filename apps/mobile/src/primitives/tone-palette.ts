import { colors } from "@repo/design-tokens";
import type { SurfaceTone } from "@repo/domain/surface-tone";

export type TonePalette = {
  background: string;
  foreground: string;
  muted: string;
  rule: string;
  wash: string;
  hatchStroke: string;
};

const PALETTES: Record<SurfaceTone, TonePalette> = {
  paper: {
    background: colors.paper,
    foreground: colors.ink,
    muted: colors.muted,
    rule: colors.rule,
    wash: colors.wash,
    hatchStroke: colors.hatchStroke,
  },
  ink: {
    background: colors.ink,
    foreground: colors.paper,
    muted: colors.dim,
    rule: colors.dimrule,
    wash: colors.raised,
    hatchStroke: colors.hatchStrokeOnInk,
  },
};

export function tonePalette(tone: SurfaceTone): TonePalette {
  return PALETTES[tone];
}
