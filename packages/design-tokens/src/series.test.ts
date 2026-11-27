import { describe, expect, it } from "vitest";
import type { CoinElement } from "./marks.ts";
import {
  seriesBadgeColours,
  seriesBadgeCount,
  seriesBadgeHex,
  seriesBadgeSizes,
  seriesBadgeToneColors,
  seriesBadgeViewBox,
  seriesEmblems,
  type SeriesBadgeColour,
  type SeriesBadgeEmblem,
} from "./series.ts";

const SHADOW_OFFSET = "translate(4 5)";

const emblems = Object.keys(seriesEmblems) as SeriesBadgeEmblem[];
const colours = Object.keys(seriesBadgeColours) as SeriesBadgeColour[];

function withoutShadowOffset(element: CoinElement) {
  const { transform, ...attrs } = element.attrs;
  const rest = transform?.slice(SHADOW_OFFSET.length).trim();
  return {
    shape: element.shape,
    paint: element.paint,
    attrs: rest ? { ...attrs, transform: rest } : attrs,
  };
}

function withoutTone({ shape, paint, attrs }: CoinElement) {
  return { shape, paint, attrs };
}

describe("seriesEmblems", () => {
  it("has the seven emblems in the picker's order", () => {
    expect(emblems).toEqual([
      "cup",
      "crown",
      "star",
      "bolt",
      "flame",
      "moon",
      "ball",
    ]);
  });

  it.each(emblems)("%s paints only shade, paper and ink", (emblem) => {
    const elements: readonly CoinElement[] = seriesEmblems[emblem];
    expect(elements.length).toBeGreaterThan(0);
    for (const element of elements) {
      expect(["shade", "paper", "ink"]).toContain(element.tone);
    }
  });

  it.each(emblems)("%s opens with the shadow of its own body", (emblem) => {
    const elements: readonly CoinElement[] = seriesEmblems[emblem];
    const shadow = elements.filter((element) => element.tone === "shade");
    const body = elements.slice(shadow.length);
    expect(shadow.length).toBeGreaterThan(0);
    expect(elements.slice(0, shadow.length)).toEqual(shadow);
    expect(body.some((element) => element.tone === "paper")).toBe(true);
    for (const element of shadow) {
      expect(element.attrs.transform?.startsWith(SHADOW_OFFSET)).toBe(true);
    }
    expect(shadow.map(withoutShadowOffset)).toEqual(
      body.slice(0, shadow.length).map(withoutTone),
    );
  });
});

describe("seriesBadgeColours", () => {
  it("has the six colours in the picker's order, each with its two values", () => {
    expect(colours).toEqual(["gold", "red", "blue", "green", "purple", "teal"]);
    expect(seriesBadgeColours).toEqual({
      gold: { disc: "#ffc233", shade: "#c98f0a" },
      red: { disc: "#ff4d3d", shade: "#a8261a" },
      blue: { disc: "#3b6cff", shade: "#1f42b8" },
      green: { disc: "#34d17a", shade: "#178f4d" },
      purple: { disc: "#8b5cff", shade: "#5a33c2" },
      teal: { disc: "#22c3b5", shade: "#137f75" },
    });
  });
});

describe("the badge's geometry", () => {
  it("draws a hexagon whose stroke rounds its corners, in a 120 viewBox", () => {
    expect(seriesBadgeViewBox).toBe(120);
    expect(seriesBadgeHex).toEqual({
      points: "60,8 105,34 105,86 60,112 15,86 15,34",
      strokeWidth: 10,
      strokeLinejoin: "round",
    });
  });

  it("has the nine sizes the design draws", () => {
    expect(seriesBadgeSizes).toEqual({
      tally: 12,
      line: 22,
      row: 28,
      latest: 38,
      list: 44,
      card: 60,
      page: 76,
      sheet: 84,
      preview: 116,
    });
  });

  it("puts a 20 by 20 count pill outside the bottom trailing corner", () => {
    expect(seriesBadgeCount).toEqual({
      minWidth: 20,
      height: 20,
      paddingInline: 5,
      radius: 10,
      ring: 2,
      fontSize: 11,
      offsetEnd: 6,
      offsetBottom: 2,
    });
  });
});

describe("seriesBadgeToneColors", () => {
  it.each(colours)(
    "paints %s in its own colours on light ink and paper",
    (colour) => {
      expect(seriesBadgeToneColors(colour)).toEqual({
        ...seriesBadgeColours[colour],
        ink: "#000000",
        paper: "#ffffff",
      });
    },
  );
});
