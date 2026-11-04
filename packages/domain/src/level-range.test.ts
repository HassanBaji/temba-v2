import { isolate } from "@repo/i18n/bidi";
import { messagesFor } from "@repo/i18n/messages";
import { describe, expect, it } from "vitest";

import { LEVEL_BANDS } from "./level-bands";
import {
  formatLevelRangeLabel,
  formatLevelRangeProseLabel,
  formatLevelRangeGateCopy,
  formatLevelTenths,
  LEVEL_BAND_MAX_TENTHS,
  LEVEL_BAND_MIN_TENTHS,
  parseLevelBandSelectTenths,
  parseOptionalLevelTenths,
  tenthsToLevelBand,
  tenthsToLevelBandSelectValue,
  tenthsToMajorInput,
} from "./level-range";

describe("parseOptionalLevelTenths", () => {
  it("treats blank as unset", () => {
    expect(parseOptionalLevelTenths("", "en")).toEqual({
      ok: true,
      tenths: null,
    });
    expect(parseOptionalLevelTenths("   ", "en")).toEqual({
      ok: true,
      tenths: null,
    });
  });

  it("parses 0.0 as tenths 0, not unset", () => {
    expect(parseOptionalLevelTenths("0", "en")).toEqual({
      ok: true,
      tenths: 0,
    });
    expect(parseOptionalLevelTenths("0.0", "en")).toEqual({
      ok: true,
      tenths: 0,
    });
  });

  it("parses whole units and one decimal into tenths", () => {
    expect(parseOptionalLevelTenths("3", "en")).toEqual({
      ok: true,
      tenths: 30,
    });
    expect(parseOptionalLevelTenths("3.0", "en")).toEqual({
      ok: true,
      tenths: 30,
    });
    expect(parseOptionalLevelTenths("4.2", "en")).toEqual({
      ok: true,
      tenths: 42,
    });
    expect(parseOptionalLevelTenths("7", "en")).toEqual({
      ok: true,
      tenths: 70,
    });
    expect(parseOptionalLevelTenths("7.0", "en")).toEqual({
      ok: true,
      tenths: 70,
    });
  });

  it("refuses extra decimals, negatives, non-numeric input, and values above 7.0", () => {
    expect(parseOptionalLevelTenths("4.25", "en")).toEqual({
      ok: false,
      message: "Use one decimal place",
    });
    expect(parseOptionalLevelTenths("-1", "en").ok).toBe(false);
    expect(parseOptionalLevelTenths("abc", "en").ok).toBe(false);
    expect(parseOptionalLevelTenths("7.1", "en")).toEqual({
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
    expect(formatLevelTenths(34)).toBe("3.4");
    expect(formatLevelTenths(34)).not.toMatch(/[A-D]\+?/);
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

  it("round-trips display rungs to inclusive tenths", () => {
    expect(parseLevelBandSelectTenths("D", "min")).toBe(0);
    expect(parseLevelBandSelectTenths("D", "max")).toBe(13);
    expect(parseLevelBandSelectTenths("C-", "min")).toBe(21);
    expect(parseLevelBandSelectTenths("C-", "max")).toBe(27);
    expect(parseLevelBandSelectTenths("C", "min")).toBe(28);
    expect(parseLevelBandSelectTenths("C", "max")).toBe(34);
    expect(parseLevelBandSelectTenths("C+", "min")).toBe(35);
    expect(parseLevelBandSelectTenths("C+", "max")).toBe(41);
    expect(parseLevelBandSelectTenths("A", "min")).toBe(63);
    expect(parseLevelBandSelectTenths("A", "max")).toBe(70);
  });

  it("refuses inverted display range min C+ and max C", () => {
    const minTenths = parseLevelBandSelectTenths("C+", "min");
    const maxTenths = parseLevelBandSelectTenths("C", "max");
    expect(minTenths).toBe(35);
    expect(maxTenths).toBe(34);
    expect(
      minTenths != null && maxTenths != null && minTenths > maxTenths,
    ).toBe(true);
  });
});

describe("tenthsToLevelBandSelectValue", () => {
  it("prefills None when unset and display rungs otherwise", () => {
    expect(tenthsToLevelBandSelectValue(null)).toBe("none");
    expect(tenthsToLevelBandSelectValue(undefined)).toBe("none");
    expect(tenthsToLevelBandSelectValue(0)).toBe("D");
    expect(tenthsToLevelBandSelectValue(7)).toBe("D");
    expect(tenthsToLevelBandSelectValue(14)).toBe("D+");
    expect(tenthsToLevelBandSelectValue(30)).toBe("C");
    expect(tenthsToLevelBandSelectValue(35)).toBe("C+");
  });
});

describe("formatLevelRangeLabel", () => {
  it("omits when both bounds are unset", () => {
    expect(formatLevelRangeLabel(null, null, "en")).toBeNull();
    expect(formatLevelRangeLabel(undefined, undefined, "en")).toBeNull();
  });

  it("formats captioned slots as a bare band, without a Level prefix", () => {
    expect(formatLevelRangeLabel(21, 41, "en")).toBe("C-/C+");
    expect(formatLevelRangeLabel(21, 34, "en")).toBe("C-/C");
    expect(formatLevelRangeLabel(21, null, "en")).toBe("C- and up");
    expect(formatLevelRangeLabel(null, 41, "en")).toBe("C+ and under");
    expect(formatLevelRangeLabel(30, 45, "en")).toBe("C/B-");
    expect(formatLevelRangeLabel(null, 45, "en")).toBe("B- and under");
    expect(formatLevelRangeLabel(21, 41, "en")).not.toMatch(/^Level /);
  });

  it("collapses the same display min and max to one letter and never writes D++", () => {
    expect(formatLevelRangeLabel(35, 41, "en")).toBe("C+");
    expect(formatLevelRangeLabel(30, 32, "en")).toBe("C");
    expect(formatLevelRangeLabel(0, null, "en")).toBe("D and up");
    expect(formatLevelRangeLabel(14, null, "en")).toBe("D+ and up");
    expect(formatLevelRangeLabel(0, null, "en")).not.toBe("D+");
    expect(formatLevelRangeLabel(14, null, "en")).not.toContain("D++");
  });
});

describe("formatLevelRangeProseLabel", () => {
  it("omits when both bounds are unset", () => {
    expect(formatLevelRangeProseLabel(null, null, "en")).toBeNull();
    expect(formatLevelRangeProseLabel(undefined, undefined, "en")).toBeNull();
  });

  it("prefixes Level for prose callers", () => {
    expect(formatLevelRangeProseLabel(21, 41, "en")).toBe("Level C-/C+");
    expect(formatLevelRangeProseLabel(21, 34, "en")).toBe("Level C-/C");
    expect(formatLevelRangeProseLabel(21, null, "en")).toBe("Level C- and up");
    expect(formatLevelRangeProseLabel(null, 41, "en")).toBe(
      "Level C+ and under",
    );
    expect(formatLevelRangeProseLabel(30, 45, "en")).toBe("Level C/B-");
    expect(formatLevelRangeProseLabel(null, 45, "en")).toBe(
      "Level B- and under",
    );
  });

  it("collapses the same display min and max to one letter and never writes D++", () => {
    expect(formatLevelRangeProseLabel(35, 41, "en")).toBe("Level C+");
    expect(formatLevelRangeProseLabel(30, 32, "en")).toBe("Level C");
    expect(formatLevelRangeProseLabel(0, null, "en")).toBe("Level D and up");
    expect(formatLevelRangeProseLabel(14, null, "en")).toBe("Level D+ and up");
    expect(formatLevelRangeProseLabel(0, null, "en")).not.toBe("Level D+");
    expect(formatLevelRangeProseLabel(14, null, "en")).not.toContain("D++");
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
  const LEVEL_RANGE_FIELD_DESCRIPTION =
    messagesFor("en").level.rangeFieldDescription;

  it("says optional inclusive Level bands and request when a range is set", () => {
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("Level");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toMatch(/band/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("None");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).toContain("request to play");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/rank|ELO/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/one decimal/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toContain("0.0–7.0");
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/matchmaking/i);
    expect(LEVEL_RANGE_FIELD_DESCRIPTION).not.toMatch(/D3|C3–A|letterNumber/i);
  });
});

describe("formatLevelRangeGateCopy", () => {
  it("explains the range and the viewer Level, or no Level yet", () => {
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 30,
        levelMaxTenths: 45,
        viewerLevelTenths: 52,
        locale: "en",
      }),
    ).toBe("This Game is for Level C/B-. Your Level is B.");
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 21,
        levelMaxTenths: 41,
        viewerLevelTenths: 52,
        locale: "en",
      }),
    ).toBe("This Game is for Level C-/C+. Your Level is B.");
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 30,
        levelMaxTenths: 45,
        viewerLevelTenths: null,
        locale: "en",
      }),
    ).toBe(
      "You don't have a Level yet. Declare one on You, or request to play.",
    );
  });
});

describe("Arabic Level copy", () => {
  it("writes the range and the gate in Arabic", () => {
    expect(formatLevelRangeProseLabel(21, null, "ar")).toBe(
      `المستوى ${isolate("C-")} فما فوق`,
    );
    expect(formatLevelRangeLabel(null, 41, "ar")).toBe(
      `${isolate("C+")} فما دون`,
    );
    expect(formatLevelRangeLabel(28, 42, "ar")).toBe(isolate("C/B-"));
    expect(formatLevelRangeLabel(28, 30, "ar")).toBe(isolate("C"));
    expect(
      formatLevelRangeGateCopy({
        levelMinTenths: 30,
        levelMaxTenths: 45,
        viewerLevelTenths: null,
        locale: "ar",
      }),
    ).toBe("ليس لديك مستوى بعد. حدّد واحدًا في «أنت»، أو اطلب اللعب.");
    expect(parseOptionalLevelTenths("7.1", "ar")).toEqual({
      ok: false,
      message: "يجب أن يكون المستوى بين 0.0 و7.0",
    });
  });
});
