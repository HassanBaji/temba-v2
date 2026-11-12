import { describe, expect, it } from "vitest";

import {
  formatOvr,
  levelFaceFor,
  levelFromOvr,
  muFromOvr,
  ovrFromLevel,
  ovrFromMu,
} from "./football-ovr";
import { BAND_MIDPOINTS, bandFromLevel, muFromBand } from "./level";
import { displayLabelFromStoredBand } from "./level-bands";

describe("ovrFromLevel", () => {
  it("maps the Level scale onto 40 to 99", () => {
    expect(ovrFromLevel(0)).toBe(40);
    expect(ovrFromLevel(7)).toBe(99);
  });

  it("reads the self-placed football bands as Beginner 43, Casual 61, Competitive 72, Pro 78", () => {
    expect(
      [
        BAND_MIDPOINTS.D3,
        BAND_MIDPOINTS.C3,
        BAND_MIDPOINTS.C1,
        BAND_MIDPOINTS.B3,
      ].map((level) => Math.round(ovrFromLevel(level))),
    ).toEqual([43, 61, 72, 78]);
  });

  it("keeps the Level bands: C+ runs from 69.5 to 75.4", () => {
    expect(ovrFromLevel(3.5)).toBeCloseTo(69.5);
    expect(ovrFromLevel(4.2)).toBeCloseTo(75.4);
  });
});

describe("levelFromOvr", () => {
  it("is the inverse of ovrFromLevel", () => {
    for (const level of [0, 0.35, 2.45, 3.85, 4.55, 7]) {
      expect(levelFromOvr(ovrFromLevel(level))).toBeCloseTo(level);
    }
  });

  it("reads an OVR of 74 inside C+", () => {
    expect(displayLabelFromStoredBand(bandFromLevel(levelFromOvr(74)))).toBe(
      "C+",
    );
  });

  it("clamps an OVR outside 40 to 99", () => {
    expect(levelFromOvr(20)).toBe(0);
    expect(levelFromOvr(120)).toBe(7);
  });
});

describe("ovrFromMu and muFromOvr", () => {
  it("read the stored μ of a self-placed Competitive as OVR 72", () => {
    expect(Math.round(ovrFromMu(muFromBand("C1")))).toBe(72);
  });

  it("round-trip", () => {
    expect(ovrFromMu(muFromOvr(74))).toBeCloseTo(74);
  });
});

describe("formatOvr", () => {
  it("shows a whole number inside 40 to 99", () => {
    expect(formatOvr(72.46)).toBe("72");
    expect(formatOvr(74.5)).toBe("75");
    expect(formatOvr(12)).toBe("40");
    expect(formatOvr(140)).toBe("99");
  });
});

describe("levelFaceFor", () => {
  it("reads football as OVR and padel as the Level", () => {
    expect(levelFaceFor("football")).toBe("ovr");
    expect(levelFaceFor("padel")).toBe("level");
  });
});
