import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  homeSport,
  homeSports,
  levelFromApi,
  noLevelCopy,
  standingInSport,
  standingSplit,
  statsFromProfile,
} from "./home-model";
import type { RouterOutputs } from "../trpc/react";

type ApiRating = RouterOutputs["ratings"]["me"];

describe("levelFromApi", () => {
  it("has no Level before the first Rating in a sport", () => {
    const data = {
      rating: null,
      canSelfDeclare: true,
      progressPercent: null,
      nextBand: null,
      history: [],
      historyMatchCount: 0,
      ratedMatchCount: 0,
    } as ApiRating;
    assert.deepEqual(levelFromApi(data), { kind: "none" });
    assert.equal(
      noLevelCopy("football", "en"),
      "Play a rated football game and your football Level appears.",
    );
  });

  it("carries the band, Level and progress of a Rating", () => {
    const data = {
      rating: {
        levelBand: "C3",
        level: "2.8",
        provisional: true,
        ratedMatchesRemaining: 3,
      },
      progressPercent: 1,
      history: ["3.2", "2.8"],
      historyMatchCount: 1,
    } as unknown as ApiRating;
    const level = levelFromApi(data);
    assert.equal(level.kind, "rated");
    if (level.kind !== "rated") return;
    assert.equal(level.input.level, "2.8");
    assert.equal(level.input.progressPercent, 1);
    assert.equal(level.input.historyMatchCount, 1);
  });
});

describe("per-sport sections", () => {
  it("keeps the Standing of Groups in the chosen sport, a Group with no sport being padel", () => {
    const rows = [
      {
        groupId: "a",
        groupName: "Ladder",
        sport: "padel",
        position: 2,
        memberCount: 8,
      },
      {
        groupId: "b",
        groupName: "First football",
        sport: "football",
        position: 1,
        memberCount: 1,
      },
      {
        groupId: "c",
        groupName: "Old group",
        sport: null,
        position: 3,
        memberCount: 4,
      },
    ];
    assert.deepEqual(
      standingInSport(rows, "padel").map((row) => row.groupId),
      ["a", "c"],
    );
    assert.deepEqual(
      standingInSport(rows, "football").map((row) => row.groupId),
      ["b"],
    );
  });

  it("lists only Groups with counted games and folds the rest into one row", () => {
    const split = standingSplit([
      {
        groupId: "a",
        groupName: "A",
        sport: "padel",
        position: 1,
        memberCount: 6,
      },
      {
        groupId: "b",
        groupName: "B",
        sport: "padel",
        position: null,
        memberCount: 4,
      },
      {
        groupId: "c",
        groupName: "C",
        sport: "padel",
        position: null,
        memberCount: 9,
      },
    ]);
    assert.deepEqual(
      split.counted.map((row) => row.groupId),
      ["a"],
    );
    assert.equal(split.uncounted, 2);
    assert.equal(split.total, 3);
  });

  it("reads its labels from the Arabic catalog", () => {
    assert.equal(
      noLevelCopy("padel", "ar"),
      "العب مباراة بادل مصنّفة ويظهر مستواك في البادل.",
    );
  });
});

describe("one sport or two", () => {
  it("shows only the sport on a one-sport profile", () => {
    assert.deepEqual(homeSports(["football"]), ["football"]);
    assert.deepEqual(homeSports(["padel"]), ["padel"]);
    assert.equal(homeSport(null, ["football"], "padel"), "football");
    assert.equal(homeSport("padel", ["football"], null), "football");
  });

  it("shows both sports when both are played, or none is picked yet", () => {
    assert.deepEqual(homeSports(["football", "padel"]), ["padel", "football"]);
    assert.deepEqual(homeSports([]), ["padel", "football"]);
    assert.deepEqual(homeSports(null), ["padel", "football"]);
  });

  it("opens on the sport of the next game until one is chosen", () => {
    const both = ["padel", "football"] as const;
    assert.equal(homeSport(null, both, "football"), "football");
    assert.equal(homeSport(null, both, null), "padel");
    assert.equal(homeSport("padel", both, "football"), "padel");
  });
});

type ApiProfile = RouterOutputs["users"]["myProfile"];

describe("statsFromProfile", () => {
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
    } as unknown as ApiProfile;
    const stats = statsFromProfile(profile, "en");
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
    } as unknown as ApiProfile;
    const stats = statsFromProfile(profile, "en");
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
    } as unknown as ApiProfile;
    assert.equal(statsFromProfile(profile, "en"), null);
  });
});
