import { isolate } from "@repo/i18n/bidi";
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
  levelSliderStartTenths,
  levelOverrideWhy,
  OVR_SLIDER_TICKS,
  ovrSliderLabel,
  ovrSliderReadout,
  ovrSliderStart,
  ovrSliderValueText,
} from "./level-slider";

const readout = (tenths: number, currentTenths = 24) =>
  levelSliderReadout({ tenths, currentTenths, locale: "en" });

describe("LEVEL_SLIDER_TICKS", () => {
  it("has the display-letter edges in tenths", () => {
    expect(LEVEL_SLIDER_TICKS.edgesTenths).toEqual([
      14, 21, 28, 35, 42, 49, 56, 63,
    ]);
  });

  it("labels each letter at its centre", () => {
    expect(LEVEL_SLIDER_TICKS.letters).toEqual([
      { label: "D", centreTenths: 7 },
      { label: "D+", centreTenths: 18 },
      { label: "C-", centreTenths: 25 },
      { label: "C", centreTenths: 32 },
      { label: "C+", centreTenths: 39 },
      { label: "B-", centreTenths: 46 },
      { label: "B", centreTenths: 53 },
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

describe("levelSliderStartTenths", () => {
  it("starts from the member's Level, or 3.0 without one", () => {
    expect(levelSliderStartTenths("3.2")).toBe(32);
    expect(levelSliderStartTenths("9.9")).toBe(70);
    expect(levelSliderStartTenths(null)).toBe(30);
  });
});

describe("levelSliderReadout", () => {
  it.each([
    [0, "D"],
    [13, "D"],
    [14, "D+"],
    [20, "D+"],
    [21, "C-"],
    [27, "C-"],
    [28, "C"],
    [34, "C"],
    [35, "C+"],
    [41, "C+"],
    [42, "B-"],
    [48, "B-"],
    [49, "B"],
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
      toNext: { label: "B-", distanceLabel: "0.6" },
      percentThroughRung: 14,
    });
  });

  it("signs the delta", () => {
    expect(readout(18).deltaLabel).toBe("−0.6");
    expect(readout(24).deltaLabel).toBe("0.0");
  });

  it("isolates the signed delta in Arabic", () => {
    expect(
      levelSliderReadout({ tenths: 36, currentTenths: 24, locale: "ar" })
        .deltaLabel,
    ).toBe(isolate("+1.2"));
  });

  it("measures D+ against the 14 to 21 span", () => {
    expect(readout(14).percentThroughRung).toBe(0);
    expect(readout(20)).toMatchObject({
      percentThroughRung: 86,
      toNext: { label: "C-", distanceLabel: "0.1" },
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
    expect(
      LEVEL_OVERRIDE_REASONS.map((reason) =>
        levelOverrideReasonLabel(reason, "en"),
      ),
    ).toEqual([
      "New to the Group",
      "Plays above results",
      "Plays below results",
      "Back from injury",
      "Correcting a mistake",
    ]);
  });
});

describe("level override reasons in Arabic", () => {
  it("labels a reason", () => {
    expect(levelOverrideReasonLabel("back_from_injury", "ar")).toBe(
      "عائد من إصابة",
    );
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
        locale: "en",
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
        locale: "en",
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
        locale: "en",
        now,
      }),
    ).toBe("Set by Sara K, 1 Oct");
  });

  it("names the viewer in Arabic", () => {
    expect(
      levelOverrideCaption({
        setByIsViewer: true,
        setByName: "Hassan Baji",
        createdAt: bahrainDate(2026, 9, 10, 1, 0, 0),
        locale: "ar",
        now,
      }).startsWith("حدّده أنت، "),
    ).toBe(true);
  });
});

describe("OVR slider", () => {
  it("marks the football scale's numbers, with no letters", () => {
    expect(OVR_SLIDER_TICKS.startLabel).toBe("40");
    expect(OVR_SLIDER_TICKS.endLabel).toBe("99");
    expect(OVR_SLIDER_TICKS.edges).toEqual([55, 70, 85]);
    expect(OVR_SLIDER_TICKS.marks).toEqual([
      { label: "55", at: 55 },
      { label: "70", at: 70 },
      { label: "85", at: 85 },
    ]);
  });

  it("labels the thumb with the bare whole OVR", () => {
    expect(ovrSliderLabel(72)).toBe("72");
    expect(ovrSliderLabel(71.6)).toBe("72");
    expect(ovrSliderLabel(120)).toBe("99");
    expect(ovrSliderLabel(12)).toBe("40");
  });

  it("reads OVR 72 in prose, with no band", () => {
    expect(ovrSliderValueText(72, "en")).toBe("OVR 72");
    expect(ovrSliderValueText(72, "ar")).toBe(`OVR ${isolate("72")}`);
  });

  it("reads the big OVR and fills the bar along 40 to 99, with no band", () => {
    const view = ovrSliderReadout({ ovr: 72, currentOvr: 68, locale: "en" });
    expect(view).toEqual({
      ovrLabel: "72",
      deltaLabel: "+4",
      percentOfScale: 54.2,
      scale: { lowerLabel: "40", upperLabel: "99" },
    });
    expect(
      ovrSliderReadout({ ovr: 65, currentOvr: 68, locale: "en" }).deltaLabel,
    ).toBe("−3");
    expect(
      ovrSliderReadout({ ovr: 99, currentOvr: 99, locale: "en" })
        .percentOfScale,
    ).toBe(100);
    expect(
      ovrSliderReadout({ ovr: 40, currentOvr: 99, locale: "en" })
        .percentOfScale,
    ).toBe(0);
  });

  it("starts from the member's OVR, or Level 3.0's without one", () => {
    expect(ovrSliderStart(72)).toBe(72);
    expect(ovrSliderStart(null)).toBe(65);
  });
});

describe("levelOverrideWhy", () => {
  it("gives the reason, and the note in quotes", () => {
    expect(levelOverrideWhy({ reason: "back_from_injury", locale: "en" })).toBe(
      "Back from injury",
    );
    expect(
      levelOverrideWhy({
        reason: "back_from_injury",
        note: "Two months out.",
        locale: "en",
      }),
    ).toBe("Back from injury: “Two months out.”");
    expect(
      levelOverrideWhy({
        reason: "back_from_injury",
        note: "Two months out.",
        locale: "ar",
      }),
    ).toBe(`عائد من إصابة: «${isolate("Two months out.")}»`);
  });

  it("reads an override with no reason as no reason given", () => {
    expect(levelOverrideWhy({ reason: null, locale: "en" })).toBe(
      "No reason given",
    );
    expect(levelOverrideWhy({ reason: null, locale: "ar" })).toBe(
      "دون ذكر سبب",
    );
  });
});
