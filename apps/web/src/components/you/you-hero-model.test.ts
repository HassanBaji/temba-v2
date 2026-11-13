import { describe, expect, it } from "vitest";

import {
  bandRange,
  curveCaption,
  heroStats,
  heroView,
  ratingCurve,
  type MyProfile,
  type ScopeLevel,
} from "./you-hero-model";

function level(overrides: Partial<ScopeLevel> = {}): ScopeLevel {
  return {
    level: "3.9",
    rating: 3.91,
    levelBand: "C1",
    provisional: false,
    ratedMatchesRemaining: 0,
    progressPercent: 59,
    nextBand: "B3",
    distanceToNext: 0.29,
    winsToNext: 3,
    weekDelta: 0.12,
    history: [],
    lastOverrideAt: null,
    ...overrides,
  };
}

function stats(
  overrides: Partial<MyProfile["stats"]> = {},
): MyProfile["stats"] {
  return {
    played: 24,
    won: 14,
    lost: 10,
    drawn: 0,
    winRatePercent: 58,
    run: { outcome: "won", count: 3 },
    sets: { won: 31, lost: 22 },
    longestStreak: null,
    ...overrides,
  };
}

describe("heroView", () => {
  it("reads a confirmed General Level", () => {
    const view = heroView({ level: level(), ratedMatchCount: 24 }, "en");
    expect(view.label).toBe("Temba Level");
    expect(view.status).toBe("Confirmed · 24 rated");
    expect(view.band).toBe("C+");
    expect(view.rating).toBe("3.91");
    expect(view.ring).toEqual({ percent: 59, label: "59% through" });
    expect(view.move).toBe("▲ 0.12 this week");
    expect(view.outlook).toBe(
      "0.29 to B−. 3 more wins like your recent ones get you there.",
    );
  });

  it("reads a padel Level below 1.0 as 1.00", () => {
    const view = heroView(
      {
        level: level({ rating: 0.35, levelBand: "D3" }),
        ratedMatchCount: 24,
      },
      "en",
    );
    expect(view.rating).toBe("1.00");
    expect(view.band).toBe("D");
  });

  it("counts the confirming Matches of a Provisional Level out of five", () => {
    const view = heroView(
      {
        level: level({
          provisional: true,
          ratedMatchesRemaining: 3,
          weekDelta: null,
        }),
        ratedMatchCount: 3,
      },
      "en",
    );
    expect(view.status).toBe("Provisional · 3 rated");
    expect(view.ring).toEqual({ percent: 40, label: "2 of 5 to confirm" });
    expect(view.move).toBeNull();
    expect(view.outlook).toContain("about 3 more rated matches");
  });

  it("names the top band without a distance", () => {
    const view = heroView(
      {
        level: level({ levelBand: "A", nextBand: null, distanceToNext: null }),
        ratedMatchCount: 40,
      },
      "en",
    );
    expect(view.outlook).toBe("Top level band.");
  });
});

describe("heroStats", () => {
  it("shows win rate, matches and the current run for General", () => {
    expect(heroStats(stats(), "en")).toEqual([
      { value: "58%", label: "win rate" },
      { value: "24", label: "matches" },
      { value: "W3", label: "streak" },
    ]);
  });

  it("waits for five Matches before a win rate", () => {
    const [winRate, , streak] = heroStats(
      stats({ played: 3, winRatePercent: null, run: null }),
      "en",
    );
    expect(winRate).toEqual({ value: "—", label: "win rate after 5" });
    expect(streak?.value).toBe("—");
  });
});

describe("ratingCurve", () => {
  it("has no curve without history", () => {
    expect(ratingCurve([], { rtl: false })).toBeNull();
  });

  it("runs oldest to latest across the width, between band lines", () => {
    const curve = ratingCurve([2.9, 3.2, 3.5], { rtl: false });
    expect(curve?.points).toBe("0,85.7 150,42.9 300,0");
    expect(curve?.dot).toEqual({ x: 300, y: 0 });
    expect(curve?.gridlines.map((line) => line.label)).toEqual(["C+", "C"]);
  });

  it("puts the latest point on the left in Arabic", () => {
    const curve = ratingCurve([2.9, 3.2, 3.5], { rtl: true });
    expect(curve?.dot.x).toBe(0);
    expect(curve?.points.startsWith("300,")).toBe(true);
  });
});

describe("bandRange", () => {
  it("snaps to band boundaries and spans at least one band", () => {
    expect(bandRange([3.0, 3.1])).toEqual({ low: 2.8, high: 3.5 });
    const range = bandRange([2.95, 3.38]);
    expect(range.low).toBeCloseTo(2.8);
    expect(range.high).toBeCloseTo(3.5);
  });
});

describe("curveCaption", () => {
  it("counts the rated points and spans their months", () => {
    const caption = curveCaption(
      [
        { level: 3, at: null },
        { level: 3.1, at: new Date("2026-03-04T10:00:00Z") },
        { level: 3.2, at: new Date("2026-11-02T10:00:00Z") },
      ],
      "en",
    );
    expect(caption).toEqual({
      title: "Rating, last 2 rated",
      span: "Mar to Nov",
    });
  });
});
