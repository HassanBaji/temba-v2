import { describe, expect, it } from "vitest";

import {
  bestWinStreak,
  currentWinStreak,
  type WinStreakMatch,
} from "./win-streak";

function newestFirst(results: string): WinStreakMatch[] {
  return [...results].map((result, index) => ({
    won: result === "W",
    playedAt: new Date(Date.UTC(2026, 9, 30 - index)),
  }));
}

describe("currentWinStreak", () => {
  it("counts wins back from the newest Match", () => {
    expect(currentWinStreak(newestFirst("WWWLWW"))).toBe(3);
  });

  it("is zero when the newest Match is a loss or a draw", () => {
    expect(currentWinStreak(newestFirst("LWWW"))).toBe(0);
    expect(currentWinStreak(newestFirst("DWWW"))).toBe(0);
  });

  it("is zero with no Matches", () => {
    expect(currentWinStreak([])).toBe(0);
  });
});

describe("bestWinStreak", () => {
  it("finds the longest run and the Match that completed it", () => {
    const matches = newestFirst("WLWWWLWW");
    expect(bestWinStreak(matches)).toEqual({
      count: 3,
      reachedAt: matches[2]?.playedAt,
    });
  });

  it("lets a draw end a run", () => {
    expect(bestWinStreak(newestFirst("WWDWW")).count).toBe(2);
  });

  it("gives a tie to the more recent streak", () => {
    const matches = newestFirst("LWWLWW");
    expect(bestWinStreak(matches)).toEqual({
      count: 2,
      reachedAt: matches[1]?.playedAt,
    });
  });

  it("is the current streak when that is the longest", () => {
    const matches = newestFirst("WWWLWW");
    expect(bestWinStreak(matches)).toEqual({
      count: 3,
      reachedAt: matches[0]?.playedAt,
    });
  });

  it("is empty without a win", () => {
    expect(bestWinStreak(newestFirst("LLD"))).toEqual({
      count: 0,
      reachedAt: null,
    });
    expect(bestWinStreak([])).toEqual({ count: 0, reachedAt: null });
  });
});
