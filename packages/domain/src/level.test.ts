import { describe, expect, it } from "vitest";

import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  selfDeclareChoiceFromDisplay,
  storedBandFromDisplayLabel,
} from "./level-bands";
import { PADEL_NOT_SURE_LEVEL } from "./onboarding-answers";

import {
  BAND_MIDPOINTS,
  INITIAL_PHI,
  LEVEL_OVERRIDE_PHI,
  PROVISIONAL_PHI_THRESHOLD,
  RATED_MATCHES_TO_CONFIRM,
  bandFromLevel,
  bandWithHysteresis,
  formatPadelLevel,
  confirmedPhiForOverride,
  initialRatingFromChoice,
  INITIAL_MU,
  levelFromMu,
  muFromBand,
  matchesTowardConfirming,
  padelMatchesRemainingToConfirm,
  progressToNextBand,
  ratedMatchesRemainingToConfirm,
  tembaLevelView,
  UNCONFIRMED_PADEL,
} from "./level";

describe("formatPadelLevel", () => {
  it("floors the face at 1.0 and keeps the stored value below it", () => {
    expect(formatPadelLevel(0.35, 2)).toBe("1.00");
    expect(formatPadelLevel(0, 1)).toBe("1.0");
    expect(formatPadelLevel(0.96, 2)).toBe("1.00");
  });

  it("shows two decimals on the hero and one in dense lists", () => {
    expect(formatPadelLevel(3.449, 2)).toBe("3.45");
    expect(formatPadelLevel(3.449, 1)).toBe("3.4");
    expect(formatPadelLevel(1.005, 2)).toBe("1.01");
  });

  it("tops out at 7.0", () => {
    expect(formatPadelLevel(7, 2)).toBe("7.00");
    expect(formatPadelLevel(6.999, 2)).toBe("7.00");
    expect(formatPadelLevel(9, 1)).toBe("7.0");
  });
});

describe("bandFromLevel", () => {
  it("still uses stored D3…A, not display letters", () => {
    expect(bandFromLevel(0.35)).toBe("D3");
    expect(bandFromLevel(1.05)).toBe("D2");
    expect(bandFromLevel(2.45)).toBe("C3");
    expect(bandFromLevel(3.15)).toBe("C2");
    expect(bandFromLevel(6.65)).toBe("A");
    expect(bandFromLevel(3.15)).not.toBe("C");
  });

  it("keeps hysteresis on the stored 0.7 table", () => {
    expect(bandWithHysteresis(2.75, "C2")).toBe("C2");
    expect(bandWithHysteresis(3.55, "C2")).toBe("C2");
    expect(bandWithHysteresis(2.7, "C2")).toBe("C3");
    expect(bandWithHysteresis(3.6, "C2")).toBe("C1");
  });
});

describe("self-declare write-down midpoints", () => {
  it("keeps unknown as C2 / 3.0 and display picks as stored midpoints", () => {
    const unknown = initialRatingFromChoice(
      selfDeclareChoiceFromDisplay("unknown"),
      "padel",
    );
    expect(unknown.levelBand).toBe("C2");
    expect(levelFromMu(unknown.mu)).toBe(3.0);

    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("D")]).toBe(0.35);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("D+")]).toBe(1.75);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("C-")]).toBe(2.45);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("C")]).toBe(3.15);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("C+")]).toBe(3.85);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("B-")]).toBe(4.55);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("B")]).toBe(5.25);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("B+")]).toBe(5.95);
    expect(BAND_MIDPOINTS[storedBandFromDisplayLabel("A")]).toBe(6.65);
  });
});

describe("initialRatingFromChoice", () => {
  const padelStartPhi = {
    D: 150,
    "D+": 150,
    "C-": 200,
    C: 250,
    "C+": 250,
    "B-": 250,
    B: 250,
    "B+": 250,
    A: 250,
  } as const;

  it("starts a padel declaration at its band's midpoint with the band's φ", () => {
    for (const display of ASSIGNABLE_DISPLAY_LEVEL_BANDS) {
      const band = storedBandFromDisplayLabel(display);
      expect(initialRatingFromChoice(band, "padel")).toEqual({
        mu: muFromBand(band),
        phi: padelStartPhi[display],
        sigma: 0.06,
        levelBand: band,
      });
    }
  });

  it("starts stored D2 like D", () => {
    expect(initialRatingFromChoice("D2", "padel").phi).toBe(150);
  });

  it('starts "Not sure" as a declared D+ at φ 150', () => {
    const notSure = initialRatingFromChoice(
      selfDeclareChoiceFromDisplay(PADEL_NOT_SURE_LEVEL),
      "padel",
    );
    expect(notSure.levelBand).toBe("D1");
    expect(notSure.phi).toBe(150);
  });

  it('starts "I don\'t know" at μ 1500 and φ 350 in either sport', () => {
    for (const sport of ["padel", "football"] as const) {
      expect(initialRatingFromChoice("unknown", sport)).toMatchObject({
        mu: INITIAL_MU,
        phi: INITIAL_PHI,
      });
    }
  });

  it("starts every football self-placement at φ 350, so it reads Provisional", () => {
    for (const band of ["D3", "C3", "C1", "B3"] as const) {
      const start = initialRatingFromChoice(band, "football");
      expect(start).toMatchObject({ mu: muFromBand(band), phi: INITIAL_PHI });
      expect(
        tembaLevelView({ ...start, sport: "football" }, UNCONFIRMED_PADEL)
          .provisional,
      ).toBe(true);
    }
  });

  it("leaves a new padel declarer Provisional with none of five played, whatever its φ", () => {
    const view = tembaLevelView(
      { ...initialRatingFromChoice("D3", "padel"), sport: "padel" },
      UNCONFIRMED_PADEL,
    );
    expect(view.provisional).toBe(true);
    expect(view.ratedMatchesRemaining).toBe(RATED_MATCHES_TO_CONFIRM);
    expect(matchesTowardConfirming(view.ratedMatchesRemaining)).toBe(0);
  });
});

describe("progressToNextBand", () => {
  it("returns mid-band progress toward the next Level band", () => {
    // C2 is 2.8–3.5; 3.15 is the midpoint → 50%
    expect(progressToNextBand(3.15, "C2")).toEqual({
      progressPercent: 50,
      nextBand: "C1",
    });
  });

  it("returns ~0% at the start of a band", () => {
    expect(progressToNextBand(2.8, "C2")).toEqual({
      progressPercent: 0,
      nextBand: "C1",
    });
    expect(progressToNextBand(0, "D3")).toEqual({
      progressPercent: 0,
      nextBand: "D2",
    });
  });

  it("returns ~100% at the end of a band", () => {
    expect(progressToNextBand(3.5, "C2")).toEqual({
      progressPercent: 100,
      nextBand: "C1",
    });
    expect(progressToNextBand(0.7, "D3")).toEqual({
      progressPercent: 100,
      nextBand: "D2",
    });
  });

  it("clamps progress when Level sits outside the stored band (hysteresis)", () => {
    expect(progressToNextBand(2.7, "C2").progressPercent).toBe(0);
    expect(progressToNextBand(3.6, "C2").progressPercent).toBe(100);
  });

  it("returns 100% with no next band at top band A", () => {
    expect(progressToNextBand(6.3, "A")).toEqual({
      progressPercent: 100,
      nextBand: null,
    });
    expect(progressToNextBand(6.65, "A")).toEqual({
      progressPercent: 100,
      nextBand: null,
    });
    expect(progressToNextBand(7, "A")).toEqual({
      progressPercent: 100,
      nextBand: null,
    });
  });

  it("rounds to the nearest integer percent", () => {
    // C2 2.8–3.5; 3.0 → (20/70)*100 ≈ 28.57 → 29
    expect(progressToNextBand(3.0, "C2")).toEqual({
      progressPercent: 29,
      nextBand: "C1",
    });
  });
});

describe("ratedMatchesRemainingToConfirm", () => {
  it("returns the full window at a fresh Rating", () => {
    expect(ratedMatchesRemainingToConfirm(INITIAL_PHI)).toBe(
      RATED_MATCHES_TO_CONFIRM,
    );
  });

  it("returns 0 once Provisional has cleared", () => {
    expect(ratedMatchesRemainingToConfirm(PROVISIONAL_PHI_THRESHOLD)).toBe(0);
    expect(ratedMatchesRemainingToConfirm(PROVISIONAL_PHI_THRESHOLD - 1)).toBe(
      0,
    );
  });

  it("returns at least 1 while still Provisional", () => {
    expect(ratedMatchesRemainingToConfirm(PROVISIONAL_PHI_THRESHOLD + 1)).toBe(
      1,
    );
  });

  it("scales remaining with φ between a fresh Rating and the threshold", () => {
    expect(ratedMatchesRemainingToConfirm(275)).toBe(3);
    expect(ratedMatchesRemainingToConfirm(260)).toBe(2);
  });
});

describe("padelMatchesRemainingToConfirm", () => {
  it("counts down the five Rated Matches in a Verified Group", () => {
    expect(padelMatchesRemainingToConfirm(UNCONFIRMED_PADEL)).toBe(5);
    expect(
      padelMatchesRemainingToConfirm({ verifiedMatches: 4, overridden: false }),
    ).toBe(1);
    expect(
      padelMatchesRemainingToConfirm({ verifiedMatches: 5, overridden: false }),
    ).toBe(0);
    expect(
      padelMatchesRemainingToConfirm({ verifiedMatches: 9, overridden: false }),
    ).toBe(0);
  });

  it("is 0 once a Level override set the Level", () => {
    expect(
      padelMatchesRemainingToConfirm({ verifiedMatches: 1, overridden: true }),
    ).toBe(0);
  });
});

describe("matchesTowardConfirming", () => {
  it("is the confirming Matches played out of five", () => {
    expect(matchesTowardConfirming(5)).toBe(0);
    expect(matchesTowardConfirming(2)).toBe(3);
    expect(matchesTowardConfirming(0)).toBe(5);
  });
});

describe("tembaLevelView", () => {
  const padel = {
    sport: "padel",
    mu: 1500,
    phi: 260,
    levelBand: "C2",
  } as const;

  it("keeps a padel Level Provisional until its fifth Match in a Verified Group, whatever its φ", () => {
    expect(
      tembaLevelView(
        { ...padel, phi: 120 },
        { verifiedMatches: 4, overridden: false },
      ),
    ).toEqual({
      level: "3.0",
      levelBand: "C2",
      provisional: true,
      ratedMatchesRemaining: 1,
    });
    expect(
      tembaLevelView(padel, { verifiedMatches: 5, overridden: false }),
    ).toMatchObject({ provisional: false, ratedMatchesRemaining: 0 });
  });

  it("confirms a padel Level a Level override set", () => {
    expect(
      tembaLevelView(padel, { verifiedMatches: 0, overridden: true }),
    ).toMatchObject({ provisional: false, ratedMatchesRemaining: 0 });
  });

  it("reads a football Level's Provisional from its φ", () => {
    const football = { ...padel, sport: "football" };
    expect(
      tembaLevelView({ ...football, phi: 260 }, UNCONFIRMED_PADEL),
    ).toMatchObject({ provisional: true, ratedMatchesRemaining: 2 });
    expect(
      tembaLevelView(
        { ...football, phi: 150 },
        { verifiedMatches: 0, overridden: false },
      ),
    ).toMatchObject({ provisional: false, ratedMatchesRemaining: 0 });
  });
});

describe("confirmedPhiForOverride", () => {
  it("lowers a Provisional φ to the override ceiling", () => {
    expect(confirmedPhiForOverride(350)).toBe(LEVEL_OVERRIDE_PHI);
    expect(confirmedPhiForOverride(null)).toBe(LEVEL_OVERRIDE_PHI);
  });

  it("never raises a φ that is already lower", () => {
    expect(confirmedPhiForOverride(90)).toBe(90);
  });
});
