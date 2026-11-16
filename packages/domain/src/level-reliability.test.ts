import { describe, expect, it } from "vitest";

import {
  clampReliability,
  formatReliability,
  formatReliabilityDelta,
  reliabilityLossExtraPercent,
  reliabilityLossFactor,
  reliabilityStep,
} from "./level-reliability";

describe("reliabilityStep", () => {
  it("restores 5 for an ordinary game or better", () => {
    expect(reliabilityStep(6, { provisional: false })).toBe(5);
    expect(reliabilityStep(9.2, { provisional: false })).toBe(5);
  });

  it("does nothing between 5 and 6", () => {
    expect(reliabilityStep(5, { provisional: false })).toBe(0);
    expect(reliabilityStep(5.9, { provisional: false })).toBe(0);
  });

  it("drops further the lower the rating, down to 20 at 1", () => {
    expect(reliabilityStep(4, { provisional: false })).toBe(-5);
    expect(reliabilityStep(3, { provisional: false })).toBe(-10);
    expect(reliabilityStep(1, { provisional: false })).toBe(-20);
    expect(reliabilityStep(0, { provisional: false })).toBe(-20);
  });

  it("moves a Provisional player twice as far either way", () => {
    expect(reliabilityStep(3, { provisional: true })).toBe(-20);
    expect(reliabilityStep(7, { provisional: true })).toBe(10);
  });
});

describe("reliabilityLossFactor", () => {
  it("leaves a loss alone at full Reliability", () => {
    expect(reliabilityLossFactor(100)).toBe(1);
  });

  it("grows to one and a half at none", () => {
    expect(reliabilityLossFactor(70)).toBeCloseTo(1.15);
    expect(reliabilityLossFactor(0)).toBe(1.5);
    expect(reliabilityLossFactor(-20)).toBe(1.5);
  });

  it("reads as a whole percent", () => {
    expect(reliabilityLossExtraPercent(70)).toBe(15);
    expect(reliabilityLossExtraPercent(100)).toBe(0);
  });
});

describe("Reliability on the face", () => {
  it("stays within 0 and 100", () => {
    expect(clampReliability(130)).toBe(100);
    expect(clampReliability(-4)).toBe(0);
  });

  it("formats a percent and a signed change", () => {
    expect(formatReliability(84.6)).toBe("85%");
    expect(formatReliabilityDelta(5)).toBe("+5");
    expect(formatReliabilityDelta(-10)).toBe("−10");
    expect(formatReliabilityDelta(0.2)).toBe("0");
  });
});
