import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  levelFromApi,
  noLevelCopy,
  standingCountLabel,
  standingInSport,
  venueCountLabel,
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
      ratedMatchCount: 0,
    } as ApiRating;
    assert.deepEqual(levelFromApi(data), { kind: "none" });
    assert.equal(
      noLevelCopy("football"),
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
    } as unknown as ApiRating;
    const level = levelFromApi(data);
    assert.equal(level.kind, "rated");
    if (level.kind !== "rated") return;
    assert.equal(level.input.level, "2.8");
    assert.equal(level.input.progressPercent, 1);
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
    assert.equal(standingCountLabel(1), "1 group");
    assert.equal(standingCountLabel(7), "7 groups");
  });

  it("counts bookable Venues for the empty Up next", () => {
    assert.equal(venueCountLabel(null), null);
    assert.equal(venueCountLabel(0), "No venues yet");
    assert.equal(venueCountLabel(1), "1 venue");
    assert.equal(venueCountLabel(3), "3 venues");
  });
});
