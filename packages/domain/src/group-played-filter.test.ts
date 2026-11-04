import { describe, expect, it } from "vitest";

import {
  groupPlayedCounts,
  groupPlayedMatchesFilter,
  groupPlayedStatus,
} from "./group-played-filter";

const scored = [{ slot1GamesWon: 6, slot2GamesWon: 4 }];

describe("groupPlayedStatus", () => {
  it("reads a scored Game as Finished and an unscored one as Needs score", () => {
    expect(groupPlayedStatus({ cancelled: false, scoredSets: scored })).toBe(
      "finished",
    );
    expect(groupPlayedStatus({ cancelled: false, scoredSets: [] })).toBe(
      "needs_score",
    );
  });

  it("reads a cancelled Game as Cancelled even with a score", () => {
    expect(groupPlayedStatus({ cancelled: true, scoredSets: scored })).toBe(
      "cancelled",
    );
  });
});

describe("groupPlayedMatchesFilter", () => {
  it("keeps a cancelled Game out of Finished and in All", () => {
    const game = { cancelled: true, scoredSets: [] };
    expect(groupPlayedMatchesFilter(game, "finished")).toBe(false);
    expect(groupPlayedMatchesFilter(game, "cancelled")).toBe(true);
    expect(groupPlayedMatchesFilter(game, "all")).toBe(true);
  });
});

describe("groupPlayedCounts", () => {
  it("counts each filter and the record over Finished Games only", () => {
    const counts = groupPlayedCounts([
      { cancelled: false, scoredSets: scored, outcome: "won" },
      { cancelled: false, scoredSets: scored, outcome: "draw" },
      { cancelled: false, scoredSets: scored, outcome: "lost" },
      { cancelled: false, scoredSets: scored, outcome: null },
      { cancelled: false, scoredSets: [], outcome: null },
      { cancelled: true, scoredSets: scored, outcome: "won" },
    ]);
    expect(counts).toEqual({
      finished: 4,
      needs_score: 1,
      cancelled: 1,
      all: 6,
      record: { wins: 1, draws: 1, losses: 1 },
    });
  });
});
