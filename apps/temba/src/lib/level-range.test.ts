import { describe, expect, it } from "vitest";

import { LEVEL_BANDS } from "./level-bands";
import {
  formatLevelRangeLabel,
  formatLevelRangeGateCopy,
  formatLevelTenths,
  LEVEL_BAND_MAX_TENTHS,
  LEVEL_BAND_MIN_TENTHS,
  LEVEL_RANGE_FIELD_DESCRIPTION,
  parseLevelBandSelectTenths,
  parseOptionalLevelTenths,
  tenthsToLevelBand,
  tenthsToLevelBandSelectValue,
  tenthsToMajorInput,
} from "./level-range";

describe("parseOptionalLevelTenths", () => {
  it("treats blank as unset", () => {
    expect(parseOptionalLevelTenths("")).toEqual({
      ok: true,
      tenths: null,
    });
    expect(parseOptionalLevelTenths("   ")).toEqual({
      ok: true,
      tenths: null,
    });
  });

  it("parses 0.0 as tenths 0, not unset", () => {
    expect(parseOptionalLevelTenths("0")).toEqual({ ok: true, tenths: 0 });
    expect(parseOptionalLevelTenths("0.0")).toEqual({ ok: true, tenths: 0 });
  });

  it("parses whole units and one decimal into tenths", () => {
    expect(parseOptionalLevelTenths("3")).toEqual({ ok: true, tenths: 30 });
    expect(parseOptionalLevelTenths("3.0")).toEqual({ ok: true, tenths: 30 });
    expect(parseOptionalLevelTenths("4.2")).toEqual({ ok: true, tenths: 42 });
    expect(parseOptionalLevelTenths("7")).toEqual({ ok: true, tenths: 70 });
    expect(parseOptionalLevelTenths("7.0")).toEqual({ ok: true, tenths: 70 });
  });

  it("refuses extra decimals, negatives, non-numeric input, and values above 7.0", () => {
    expect(parseOptionalLevelTenths("4.25")).toEqual({
      ok: false,
      message: "Use one decimal place",
    });
    expect(parseOptionalLevelTenths("-1").ok).toBe(false);
    expect(parseOptionalLevelTenths("abc").ok).toBe(false);
    expect(parseOptionalLevelTenths("7.1")).toEqual({
      ok: false,
      message: "Level must be between 0.0 and 7.0",
    });
  });
});

describe("formatLevelTenths", () => {
  it("formats tenths as one decimal Level", () => {
    expect(formatLevelTenths(null)).toBeNull();
    expect(formatLevelTenths(undefined)).toBeNull();
    expect(formatLevelTenths(0)).toBe("0.0");
    expect(formatLevelTenths(42)).toBe("4.2");
    expect(formatLevelTenths(30)).toBe("3.0");
  });
});

describe("LEVEL_BAND min/max tenths", () => {
  it("maps every Level band to inclusive displayed tenths", () => {
    expect(
      LEVEL_BANDS.map((band) => [band, LEVEL_BAND_MIN_TENTHS[band]]),
    ).toEqual([
      ["D3", 0],
      ["D2", 7],
      ["D1", 14],
      ["C3", 21],
      ["C2", 28],
      ["C1", 35],
      ["B3", 42],
      ["B2", 49],
      ["B1", 56],
      ["A", 63],
    ]);
    expect(
      LEVEL_BANDS.map((band) => [band, LEVEL_BAND_MAX_TENTHS[band]]),
    ).toEqual([
      ["D3", 6],
      ["D2", 13],
      ["D1", 20],
      ["C3", 27],
      ["C2", 34],
      ["C1", 41],
      ["B3", 48],
      ["B2", 55],
      ["B1", 62],
      ["A", 70],
    ]);
  });
});

describe("tenthsToLevelBand", () => {
  it("uses the same strict table as bandFromLevel", () => {
    expect(tenthsToLevelBand(0)).toBe("D3");
    expect(tenthsToLevelBand(6)).toBe("D3");
    expect(tenthsToLevelBand(7)).toBe("D2");
    expect(tenthsToLevelBand(21)).toBe("C3");
    expect(tenthsToLevelBand(27)).toBe("C3");
    expect(tenthsToLevelBand(28)).toBe("C2");
    expect(tenthsToLevelBand(30)).toBe("C2");
    expect(tenthsToLevelBand(35)).toBe("C1");
    expect(tenthsToLevelBand(41)).toBe("C1");
    expect(tenthsToLevelBand(42)).toBe("B3");
    expect(tenthsToLevelBand(45)).toBe("B3");
    expect(tenthsToLevelBand(52)).toBe("B2");
    expect(tenthsToLevelBand(63)).toBe("A");
    expect(tenthsToLevelBand(70)).toBe("A");
  });
});

describe("parseLevelBandSelectTenths", () => {
  it("treats none and blank as unset", () => {
    expect(parseLevelBandSelectTenths("none", "min")).toBeNull();
    expect(parseLevelBandSelectTenths("none", "max")).toBeNull();
    expect(parseLevelBandSelectTenths("", "min")).toBeNull();
    expect(parseLevelBandSelectTenths("  ", "max")).toBeNull();
  });

  it("persists a min band's lower tenths and a max band's upper tenths", () => {
    expect(parseLevelBandSelectTenths("C3", "min")).toBe(21);
    expect(parseLevelBandSelectTenths("C1", "max")).toBe(41);
    expect(parseLevelBandSelectTenths("C1", "min")).toBe(35);
    expect(parseLevelBandSelectTenths("C3", "max")).toBe(27);
    expect(parseLevelBandSelectTenths("D3", "min")).toBe(0);
    expect(parseLevelBandSelectTenths("A", "max")).toBe(70);
  });

  it("makes min C1 + max C3 inverted on tenths (C1 is above C3)", () => {
    const minTenths = parseLevelBandSelectTenths("C1", "min");
    const maxTenths = parseLevelBandSelectTenths("C3", "max");
    expect(minTenths).toBe(35);
    expect(maxTenths).toBe(27);
    expect(
      minTenths != null && maxTenths != null && minTenths > maxTenths,
    ).toBe(true);
  });
});

describe("tenthsToLevelBandSelectValue", () => {
  it("prefills None when unset and the Level band otherwise", () => {
    expect(tenthsToLevelBandSelectValue(null)).toBe("none");
    expect(tenthsToLevelBandSelectValue(undefined)).toBe("none");
    expect(tenthsToLevelBandSelectValue(0)).toBe("D3");
    expect(tenthsToLevelBandSelectValue(21)).toBe("C3");
    expect(tenthsToLevelBandSelectValue(41)).toBe("C1");
    expect(tenthsToLevelBandSelectValue(30)).toBe("C2");
  });
});

describe("formatLevelRangeLabel", () => {
  it("omits when both bounds are unset", () => {
    expect(formatLevelRangeLabel(null, null)).toBeNull();
    expect(formatLevelRangeLabel(undefined, undefined)).toBeNull();
  });

  it("formats min and max, min-only, and max-only as Level bands", () => {
    expect(formatLevelRangeLabel(21, 41)).toBe("Level C3–C1");
    expect(formatLevelRangeLabel(21, null)).toBe("Level C3+");
    expect(formatLevelRangeLabel(null, 41)).toBe("Level C1 and under");
    expect(formatLevelRangeLabel(30, 45)).toBe("Level C2–B3");
    expect(formatLevelRangeLabel(30, null)).toBe("Level C2+");
    expect(formatLevelRangeLabel(null, 45)).toBe("Level B3 and under");
  });

  it("collapses the same min and max band to one label", () => {
    expect(formatLevelRangeLabel(35, 41)).toBe("Level C1");
    expect(formatLevelRangeLabel(30, 32)).toBe("Level C2");
  });
});

describe("tenthsToMajorInput", () => {
  it("formats tenths as a major-unit input string", () => {
    expect(tenthsToMajorInput(null)).toBe("");
    expect(tenthsToMajorInput(0)).toBe("0.0");
    expect(tenthsToMajorInput(42)).toBe("4.2");
  });
});

describe("LEVEL_RANGE_FIELD_DESCRIPTION", () => {
  it("says optional inclusive Level bands and request when a range is set", () => {
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("Level");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toMatch(/band/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("None");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("request to play");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/rank|ELO/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/one decimal/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toContain("0.0–7.0");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/matchmaking/i);
  });
});

describe("formatLevelRangeGateCopy", () => {
  it("explains the range and the viewer Level, or no Level yet", () => {
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 30,
        levelMaxTenths: 45,
        viewerLevelTenths: 52,
      }),
    ).toBe("This Game is for Level C2–B3. Your Level is B2.");
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 21,
        levelMaxTenths: 41,
        viewerLevelTenths: 52,
      }),
    ).toBe("This Game is for Level C3–C1. Your Level is B2.");
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 30,
        levelMaxTenths: 45,
        viewerLevelTenths: null,
      }),
    ).toBe(
      "You don't have a Level yet. Declare one on You, or request to play.",
    );
  });
});
