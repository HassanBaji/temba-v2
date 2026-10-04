import { colors } from "@repo/design-tokens";
import { describe, expect, it } from "vitest";

import { tonePalette } from "./tone-palette";

describe("tonePalette", () => {
  it("reads ink on paper with the light hairline and hatch", () => {
    expect(tonePalette("paper")).toMatchObject({
      background: colors.paper,
      foreground: colors.ink,
      rule: colors.rule,
      hatchStroke: colors.hatchStroke,
    });
  });

  it("reads paper on ink with the dark hairline and hatch", () => {
    expect(tonePalette("ink")).toMatchObject({
      background: colors.ink,
      foreground: colors.paper,
      muted: colors.dim,
      rule: colors.dimrule,
      hatchStroke: colors.hatchStrokeOnInk,
    });
  });
});
