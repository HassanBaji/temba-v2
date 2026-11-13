import { describe, expect, it } from "vitest";

import {
  footballHeroStats,
  goalBars,
  recordShares,
} from "./you-football-model";

describe("goalBars", () => {
  it("runs oldest to latest, scaled to the best Match", () => {
    const bars = goalBars([
      { matchId: "new", goals: 2 },
      { matchId: "old", goals: 1 },
    ]);
    expect(bars).toHaveLength(10);
    expect(bars[0]).toEqual({ key: "empty-0", goals: null, height: 0 });
    expect(bars[8]).toEqual({ key: "old", goals: 1, height: 50 });
    expect(bars[9]).toEqual({ key: "new", goals: 2, height: 100 });
  });

  it("keeps empty bars flat when nobody scored", () => {
    expect(goalBars([{ matchId: "a", goals: 0 }])[9]?.height).toBe(0);
  });
});

const overall = { played: 11, won: 6, lost: 3, drawn: 2, goals: 7 };

describe("footballHeroStats", () => {
  it("shows matches, goals and goals a game", () => {
    expect(footballHeroStats(overall, "en")).toEqual([
      { value: "11", label: "matches" },
      { value: "7", label: "goals" },
      { value: "0.64", label: "goals a game" },
    ]);
  });

  it("has no rate before a Match", () => {
    expect(
      footballHeroStats({ ...overall, played: 0, goals: 0 }, "en")[2]?.value,
    ).toBe("—");
  });
});

describe("recordShares", () => {
  it("splits every Match into won, drawn and lost", () => {
    expect(recordShares(overall)).toEqual({
      won: 54.5,
      drawn: 18.2,
      lost: 27.3,
    });
    expect(recordShares({ ...overall, played: 0 })).toEqual({
      won: 0,
      drawn: 0,
      lost: 0,
    });
  });
});
