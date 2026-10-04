import { describe, expect, it } from "vitest";

import { formatWinRate, winRatePercent } from "./win-rate";

describe("winRatePercent", () => {
  it("counts a draw as played and not won", () => {
    expect(winRatePercent(2, 4)).toBe(50);
  });

  it("rounds to a whole percent", () => {
    expect(winRatePercent(1, 3)).toBe(33);
    expect(winRatePercent(2, 3)).toBe(67);
  });

  it("is null when nothing was played", () => {
    expect(winRatePercent(0, 0)).toBeNull();
  });
});

describe("formatWinRate", () => {
  it("formats a percent", () => {
    expect(formatWinRate(2, 4)).toBe("50%");
    expect(formatWinRate(0, 2)).toBe("0%");
  });

  it("shows a dash when nothing was played", () => {
    expect(formatWinRate(0, 0)).toBe("—");
  });
});
