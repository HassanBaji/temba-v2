import { describe, expect, it } from "vitest";

import { isMatchMinutes, matchMinutesStep } from "./match-minutes";

describe("match minutes", () => {
  it("takes 10 to 120 minutes in steps of 5", () => {
    expect(isMatchMinutes(10)).toBe(true);
    expect(isMatchMinutes(45)).toBe(true);
    expect(isMatchMinutes(120)).toBe(true);
    expect(isMatchMinutes(5)).toBe(false);
    expect(isMatchMinutes(125)).toBe(false);
    expect(isMatchMinutes(42)).toBe(false);
  });

  it("steps by 5 and stops at either end", () => {
    expect(matchMinutesStep(45, 1)).toBe(50);
    expect(matchMinutesStep(45, -1)).toBe(40);
    expect(matchMinutesStep(10, -1)).toBeNull();
    expect(matchMinutesStep(120, 1)).toBeNull();
  });
});
