import { colors, darkColors, invertedFocusColors } from "@repo/design-tokens";
import { seriesBadgeColours, seriesEmblems } from "@repo/design-tokens/series";
import { SERIES_COLOURS, SERIES_EMBLEMS } from "@repo/domain/series";
import { describe, expect, it } from "vitest";

import { seriesBadgeCountColors } from "./series-badge-count";

describe("SeriesBadge", () => {
  it("has an emblem for every SeriesEmblem and no other, in the same order", () => {
    expect(Object.keys(seriesEmblems)).toEqual([...SERIES_EMBLEMS]);
  });

  it("has a colour for every SeriesColour and no other, in the same order", () => {
    expect(Object.keys(seriesBadgeColours)).toEqual([...SERIES_COLOURS]);
  });
});

describe("seriesBadgeCountColors", () => {
  const palettes = [
    ["light", invertedFocusColors],
    ["dark", darkColors],
  ] as const;
  const surfaces = ["paper", "sheet", "focus"] as const;

  it.each(palettes)(
    "draws an ink pill with paper digits on paper and on a sheet in %s",
    (_scheme, palette) => {
      for (const surface of ["paper", "sheet"] as const) {
        expect(seriesBadgeCountColors(surface, palette)).toEqual({
          fill: palette.ink,
          digits: palette.paper,
          ring: palette[surface],
        });
      }
    },
  );

  it.each(palettes)(
    "draws the pill from the focused surface's own roles in %s",
    (_scheme, palette) => {
      expect(seriesBadgeCountColors("focus", palette)).toEqual({
        fill: palette.onFocus,
        digits: palette.focus,
        ring: palette.focus,
      });
    },
  );

  it.each(palettes)(
    "never sinks the pill into the surface under it in %s",
    (_scheme, palette) => {
      for (const surface of surfaces) {
        const pill = seriesBadgeCountColors(surface, palette);
        expect(pill.fill).not.toBe(palette[surface]);
        expect(pill.digits).not.toBe(pill.fill);
      }
    },
  );

  it("draws nothing white in dark", () => {
    for (const surface of surfaces) {
      expect(
        Object.values(seriesBadgeCountColors(surface, darkColors)),
      ).not.toContain(colors.paper);
    }
  });
});
