import type { Palette } from "@repo/design-tokens";
import type { SurfaceTone } from "@repo/domain/surface-tone";

export type TonePalette = {
  background: string;
  foreground: string;
  muted: string;
  rule: string;
  wash: string;
  hatchStroke: string;
  /** The control that sits on this tone: a primary button, an active cell. */
  control: string;
  onControl: string;
};

export function tonePalette(tone: SurfaceTone, colors: Palette): TonePalette {
  if (tone === "ink") {
    return {
      background: colors.focus,
      foreground: colors.onFocus,
      muted: colors.dim,
      rule: colors.dimrule,
      wash: colors.raised,
      hatchStroke: colors.hatchStrokeOnInk,
      control: colors.focusControl,
      onControl: colors.onFocusControl,
    };
  }
  return {
    background: colors.paper,
    foreground: colors.ink,
    muted: colors.muted,
    rule: colors.rule,
    wash: colors.wash,
    hatchStroke: colors.hatchStroke,
    control: colors.control,
    onControl: colors.onControl,
  };
}
