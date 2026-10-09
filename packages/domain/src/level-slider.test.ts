import { describe, expect, it } from "vitest";

import { bahrainDate } from "./bahrain-date.test-support";
import {
  clampLevelTenths,
  LEVEL_SLIDER_TICKS,
  levelOverrideCaption,
  levelOverrideReasonLabel,
  LEVEL_OVERRIDE_REASONS,
  levelSliderLabel,
  levelSliderReadout,
} from "./level-slider";

const readout = (tenths: number, currentTenths = 24) =>
  levelSliderReadout({ tenths, currentTenths });

describe("LEVEL_SLIDER_TICKS", () => {
  it("has the display-letter edges in tenths", () => {
    expect(LEVEL_SLIDER_TICKS.edgesTenths).toEqual([14, 21, 35, 42, 56, 63]);
  });

  it("labels each letter at its centre", () => {
    expect(LEVEL_SLIDER_TICKS.letters).toEqual([
      { label: "D", centreTenths: 7 },
      { label: "D+", centreTenths: 18 },
      { label: "C", centreTenths: 28 },
      { label: "C+", centreTenths: 39 },
      { label: "B", centreTenths: 49 },
      { label: "B+", centreTenths: 60 },
      { label: "A", centreTenths: 67 },
    ]);
    expect(LEVEL_SLIDER_TICKS.startLabel).toBe("0.0");
    expect(LEVEL_SLIDER_TICKS.endLabel).toBe("7.0");
  });
});

describe("clampLevelTenths", () => {
  it("returns an integer from 0 to 70", () => {
    expect(clampLevelTenths(-4)).toBe(0);
    expect(clampLevelTenths(71)).toBe(70);
    expect(clampLevelTenths(36.4)).toBe(36);
    expect(clampLevelTenths(36.6)).toBe(37);
  });
});

describe("levelSliderReadout", () => {
  it.each([
    [0, "D"],
    [13, "D"],
    [14, "D+"],
    [20, "D+"],
    [21, "C"],
    [34, "C"],
    [35, "C+"],
    [41, "C+"],
    [42, "B"],
    [55, "B"],
    [56, "B+"],
    [62, "B+"],
    [63, "A"],
    [70, "A"],
  ])("puts %i tenths on %s", (tenths, letter) => {
    expect(readout(tenths).displayBand).toBe(letter);
  });

  it("describes Level, delta and the rung", () => {
    expect(readout(36)).toMatchObject({
      levelLabel: "3.6",
      deltaLabel: "+1.2",
      rung: { label: "C+", lowerTenths: 35, upperTenths: 42 },
      toNext: { label: "B", distanceLabel: "0.6" },
      percentThroughRung: 14,
    });
  });

  it("signs the delta", () => {
    expect(readout(18).deltaLabel).toBe("−0.6");
    expect(readout(24).deltaLabel).toBe("0.0");
  });

  it("measures D+ against the 14 to 21 span", () => {
    expect(readout(14).percentThroughRung).toBe(0);
    expect(readout(20)).toMatchObject({
      percentThroughRung: 86,
      toNext: { label: "C", distanceLabel: "0.1" },
    });
  });

  it("has no next letter at A and is 100 percent at 7.0", () => {
    expect(readout(63).toNext).toBeNull();
    expect(readout(70)).toMatchObject({
      toNext: null,
      percentThroughRung: 100,
    });
  });
});

describe("levelSliderLabel", () => {
  it("joins the letter and the Level", () => {
    expect(levelSliderLabel(36)).toBe("C+ 3.6");
    expect(levelSliderLabel(99)).toBe("A 7.0");
  });
});

describe("level override reasons", () => {
  it("labels the five reasons", () => {
    expect(LEVEL_OVERRIDE_REASONS.map(levelOverrideReasonLabel)).toEqual([
      "New to the Group",
      "Plays above results",
      "Plays below results",
      "Back from injury",
      "Correcting a mistake",
    ]);
  });
});

describe("levelOverrideCaption", () => {
  const now = bahrainDate(2026, 9, 10, 9, 0, 0);

  it("says you and today", () => {
    expect(
      levelOverrideCaption({
        setByIsViewer: true,
        setByName: "Hassan Baji",
        createdAt: bahrainDate(2026, 9, 10, 1, 0, 0),
        now,
      }),
    ).toBe("Set by you, today");
  });

  it("names another setter and counts days", () => {
    expect(
      levelOverrideCaption({
        setByIsViewer: false,
        setByName: "Sara Khan",
        createdAt: bahrainDate(2026, 9, 7, 12, 0, 0),
        now,
      }),
    ).toBe("Set by Sara K, 3 days ago");
  });

  it("falls back to a date after a week", () => {
    expect(
      levelOverrideCaption({
        setByIsViewer: false,
        setByName: "Sara Khan",
        createdAt: bahrainDate(2026, 9, 1, 12, 0, 0),
        now,
      }),
    ).toBe("Set by Sara K, 1 Oct");
  });
});
