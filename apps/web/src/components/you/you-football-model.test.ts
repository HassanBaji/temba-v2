import { describe, expect, it } from "vitest";

import {
  footballGroupRowView,
  footballHeroStats,
  footballLevelLabel,
  goalBars,
  recordShares,
} from "./you-football-model";
import type { GroupLevelRow } from "./you-hero-model";

describe("footballLevelLabel", () => {
  it("reads a self-placement rung as its word", () => {
    expect(footballLevelLabel("C1", "en")).toBe("Competitive");
    expect(footballLevelLabel("D3", "en")).toBe("Beginner");
  });

  it("reads any other band as its letter", () => {
    expect(footballLevelLabel("B2", "en")).toBe("B");
  });
});

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

describe("footballGroupRowView", () => {
  const row: GroupLevelRow = {
    groupId: "g",
    name: "Karbabad 5s",
    imageUrl: null,
    level: "4.6",
    rating: 4.61,
    levelBand: "B3",
    provisional: false,
    ratedMatchesRemaining: 0,
    ratedMatchCount: 0,
    rank: 1,
    rankedCount: 8,
    differenceFromGeneral: 0.7,
    setBy: { name: "Ali R", at: new Date() },
  };

  it("names the Organizer and the step above", () => {
    expect(footballGroupRowView(row, "en")).toEqual({
      groupId: "g",
      initials: "K5",
      name: "Karbabad 5s",
      sub: "Set by Ali R, organizer",
      level: "Pro",
      difference: { text: "+0.70", above: true },
    });
  });

  it("reads an untouched Group Level as the same as yours", () => {
    const view = footballGroupRowView(
      { ...row, setBy: null, levelBand: "C1", differenceFromGeneral: 0 },
      "en",
    );
    expect(view.sub).toBe("Same as yours");
    expect(view.difference).toEqual({ text: "Same", above: false });
  });
});
