import { seriesBadgeColours, seriesEmblems } from "@repo/design-tokens/series";
import { SERIES_COLOURS, SERIES_EMBLEMS } from "@repo/domain/series";
import { describe, expect, it } from "vitest";

describe("SeriesBadge", () => {
  it("has an emblem for every SeriesEmblem and no other, in the same order", () => {
    expect(Object.keys(seriesEmblems)).toEqual([...SERIES_EMBLEMS]);
  });

  it("has a colour for every SeriesColour and no other, in the same order", () => {
    expect(Object.keys(seriesBadgeColours)).toEqual([...SERIES_COLOURS]);
  });
});
