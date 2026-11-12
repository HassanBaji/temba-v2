import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { levelFromApi, noLevelCopy, standingInSport } from "./home-model";
import type { RouterOutputs } from "../trpc/react";

type ApiRating = RouterOutputs["ratings"]["me"];

describe("levelFromApi", () => {
  it("has no Level before the first Rating in a sport", () => {
    const data = {
      face: "level",
      ovr: null,
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

  it("carries the football OVR", () => {
    const data = {
      face: "ovr",
      ovr: 72,
      rating: {
        levelBand: "C1",
        level: "3.9",
        provisional: true,
        ratedMatchesRemaining: 5,
      },
      progressPercent: 50,
      history: [],
      historyMatchCount: 0,
    } as unknown as ApiRating;
    const level = levelFromApi(data);
    if (level.kind !== "rated") throw new Error("Expected a rated Level");
    assert.equal(level.input.sport, "football");
    assert.equal(level.input.ovr, 72);
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

  it("reads its labels from the Arabic catalog", () => {
    assert.equal(
      noLevelCopy("padel", "ar"),
      "العب مباراة بادل مصنّفة ويظهر مستواك في البادل.",
    );
  });
});
