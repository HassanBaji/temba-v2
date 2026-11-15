import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { homeStats, type HomeStatsInput } from "./home-stats";

describe("homeStats", () => {
  it("counts win rate, the current run and the best run for padel", () => {
    const profile = {
      stats: {
        played: 31,
        won: 21,
        lost: 10,
        drawn: 0,
        winRatePercent: 68,
        run: { outcome: "won", count: 4 },
        longestStreak: {
          count: 5,
          reachedAt: new Date("2026-10-14T18:00:00Z"),
        },
      },
      football: null,
    } as unknown as HomeStatsInput;
    const stats = homeStats(profile, "en");
    assert.equal(stats?.meta, "31 matches");
    assert.deepEqual(
      stats?.tiles.map((tile) => [tile.label, tile.value, tile.caption]),
      [
        ["Win rate", "68%", "31 played"],
        ["Wins in a row", "4", "best is 5"],
        ["Best run", "5", "wins, in October"],
      ],
    );
    assert.deepEqual(stats?.tiles[1]?.mark, {
      kind: "dots",
      filled: 4,
      total: 5,
    });
  });

  it("counts goals, clean sheets and the unbeaten run for football", () => {
    const profile = {
      stats: {
        played: 12,
        won: 5,
        lost: 3,
        drawn: 4,
        winRatePercent: 42,
        run: null,
        longestStreak: { count: 2, reachedAt: null },
      },
      football: { goals: 5, cleanSheets: 3, unbeaten: { current: 3, best: 5 } },
    } as unknown as HomeStatsInput;
    const stats = homeStats(profile, "en");
    assert.deepEqual(
      stats?.tiles.map((tile) => [tile.label, tile.value, tile.caption]),
      [
        ["Goals", "5", "0.4 a game"],
        ["Clean sheets", "3", "of 12 matches"],
        ["Unbeaten", "3", "best is 5"],
      ],
    );
  });

  it("has no tiles before the first counted match", () => {
    const profile = {
      stats: {
        played: 0,
        run: null,
        longestStreak: null,
        winRatePercent: null,
      },
      football: null,
    } as unknown as HomeStatsInput;
    assert.equal(homeStats(profile, "en"), null);
  });
});
