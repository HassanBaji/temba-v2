import { describe, expect, it } from "vitest";

import {
  INITIAL_PHI,
  PROVISIONAL_PHI_THRESHOLD,
  RATED_MATCHES_TO_CONFIRM,
  progressToNextBand,
  ratedMatchesRemainingToConfirm,
} from "./level";

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
