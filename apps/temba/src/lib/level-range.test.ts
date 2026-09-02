import { describe, expect, it } from "vitest";

import {
  formatLevelRangeLabel,
  formatLevelTenths,
  LEVEL_RANGE_FIELD_DESCRIPTION,
  parseOptionalLevelTenths,
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

describe("formatLevelRangeLabel", () => {
  it("omits when both bounds are unset", () => {
    expect(formatLevelRangeLabel(null, null)).toBeNull();
    expect(formatLevelRangeLabel(undefined, undefined)).toBeNull();
  });

  it("formats min and max, min-only, and max-only", () => {
    expect(formatLevelRangeLabel(30, 45)).toBe("Level 3.0–4.5");
    expect(formatLevelRangeLabel(30, null)).toBe("Level 3.0+");
    expect(formatLevelRangeLabel(null, 45)).toBe("Level 4.5 and under");
  });
});

describe("tenthsToMajorInput", () => {
  it("prefills the organizer Field from tenths", () => {
    expect(tenthsToMajorInput(null)).toBe("");
    expect(tenthsToMajorInput(0)).toBe("0.0");
    expect(tenthsToMajorInput(42)).toBe("4.2");
  });
});

describe("LEVEL_RANGE_FIELD_DESCRIPTION", () => {
  it("says Level, optional, inclusive, and request when a range is set", () => {
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("Level");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/rank|ELO/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("request to play");
  });
});
