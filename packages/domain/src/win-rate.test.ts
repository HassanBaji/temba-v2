import { describe, expect, it } from "vitest";

import {
  formatWinRate,
  shownWinRatePercent,
  WIN_RATE_MIN_MATCHES,
  winRatePercent,
} from "./win-rate";

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

describe("shownWinRatePercent", () => {
  it("hides the rate below the minimum Matches", () => {
    expect(WIN_RATE_MIN_MATCHES).toBe(5);
    expect(shownWinRatePercent(0, 2)).toBeNull();
    expect(shownWinRatePercent(4, 4)).toBeNull();
  });

  it("shows the rate from the minimum Matches", () => {
    expect(shownWinRatePercent(2, 5)).toBe(40);
    expect(shownWinRatePercent(0, 6)).toBe(0);
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
