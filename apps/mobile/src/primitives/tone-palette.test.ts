import { colors, darkColors, invertedFocusColors } from "@repo/design-tokens";
import { describe, expect, it } from "vitest";

import { tonePalette } from "./tone-palette";

describe("tonePalette", () => {
  it("reads ink on paper with the light hairline and hatch", () => {
    expect(tonePalette("paper", colors)).toMatchObject({
      background: colors.paper,
      foreground: colors.ink,
      rule: colors.rule,
      hatchStroke: colors.hatchStroke,
    });
  });

  it("inverts the focused surface in light", () => {
    expect(tonePalette("ink", invertedFocusColors)).toMatchObject({
      background: colors.ink,
      foreground: colors.paper,
      muted: invertedFocusColors.dim,
      rule: invertedFocusColors.dimrule,
      hatchStroke: invertedFocusColors.hatchStrokeOnInk,
    });
  });

  it("lifts the focused surface in dark instead of inverting it", () => {
    const palette = tonePalette("ink", darkColors);
    expect(palette.background).toBe(darkColors.focus);
    expect(palette.background).not.toBe(darkColors.ink);
    expect(palette.foreground).toBe(darkColors.ink);
    expect(palette.rule).toBe(darkColors.dimrule);
  });

  it("never draws white in dark", () => {
    for (const tone of ["paper", "ink"] as const) {
      expect(Object.values(tonePalette(tone, darkColors))).not.toContain(
        colors.paper,
      );
    }
  });
});
