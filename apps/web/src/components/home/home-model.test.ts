import assert from "node:assert/strict";
import { describe, it } from "vitest";

import type { RouterOutputs } from "~/trpc/react";

import {
  createHref,
  gameHref,
  levelFromApi,
  noLevelCopy,
  slotOf,
  standingInSport,
} from "./home-model";

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

describe("slotOf", () => {
  it("is loading, then failed or ready", () => {
    const map = (value: number) => value * 2;
    assert.deepEqual(
      slotOf({ data: undefined, error: null, isLoading: true }, map),
      { status: "loading" },
    );
    assert.deepEqual(
      slotOf({ data: 1, error: { message: "Down" }, isLoading: false }, map),
      { status: "error", message: "Down" },
    );
    assert.deepEqual(slotOf({ data: 2, error: null, isLoading: false }, map), {
      status: "ready",
      value: 4,
    });
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
});

describe("links", () => {
  it("opens a Game, or the step its intent names", () => {
    assert.equal(
      gameHref({ kind: "game", gameId: "g1" }),
      "/dashboard/games/g1",
    );
    assert.equal(
      gameHref({ kind: "game", gameId: "g1", intent: "results" }),
      "/dashboard/games/g1?intent=results",
    );
  });

  it("creates a Group first when the player has none to create a Game in", () => {
    assert.equal(
      createHref({
        kind: "group",
        target: { kind: "create-group" },
        label: "Create Group",
      }),
      "/dashboard/groups/new",
    );
    assert.equal(
      createHref({
        kind: "game",
        target: { kind: "create-game" },
        label: "Create",
      }),
      "/dashboard/games/new",
    );
  });
});
