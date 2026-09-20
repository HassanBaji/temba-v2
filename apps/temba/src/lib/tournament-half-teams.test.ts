import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  MERGE_COMPLETES_FIELD_COPY,
  MERGE_TAKES_EFFECT_COPY,
  defaultMergePositions,
  halfTeamMergeHint,
  halfTeamsFromSides,
  mergeCompletesTheField,
  openPositionLabel,
  samePositionMerge,
  swapMergePositions,
} from "./tournament-half-teams";

const ada = { userId: "ada", name: "Ada", image: null };
const jonas = { userId: "jonas", name: "Jonas", image: null };
const sofia = { userId: "sofia", name: "Sofia", image: null };

describe("halfTeamsFromSides", () => {
  it("lists every Half team and which Position is open", () => {
    const halfTeams = halfTeamsFromSides([
      {
        sideIndex: 1,
        gameTeamId: "team-1",
        left: ada,
        right: null,
      },
      {
        sideIndex: 2,
        gameTeamId: "team-2",
        left: sofia,
        right: jonas,
      },
      {
        sideIndex: 3,
        gameTeamId: "team-3",
        left: null,
        right: jonas,
      },
      {
        sideIndex: 4,
        gameTeamId: null,
        left: null,
        right: null,
      },
    ]);

    assert.deepEqual(halfTeams, [
      {
        gameTeamId: "team-1",
        sideIndex: 1,
        occupant: ada,
        takenPosition: "left",
        openPosition: "right",
      },
      {
        gameTeamId: "team-3",
        sideIndex: 3,
        occupant: jonas,
        takenPosition: "right",
        openPosition: "left",
      },
    ]);
  });
});

describe("half team merge copy", () => {
  it("tells the Organizer that merging two Half teams completes the field", () => {
    const two = halfTeamsFromSides([
      {
        sideIndex: 1,
        gameTeamId: "a",
        left: ada,
        right: null,
      },
      {
        sideIndex: 2,
        gameTeamId: "b",
        left: null,
        right: jonas,
      },
    ]);
    assert.equal(mergeCompletesTheField(two), true);
    assert.equal(halfTeamMergeHint(two.length), MERGE_COMPLETES_FIELD_COPY);
  });

  it("does not claim the field is complete when more than two Half teams remain", () => {
    assert.equal(halfTeamMergeHint(3), null);
    assert.equal(halfTeamMergeHint(1), null);
    assert.equal(mergeCompletesTheField([]), false);
  });

  it("does not claim a message was sent", () => {
    const copy = `${MERGE_COMPLETES_FIELD_COPY} ${MERGE_TAKES_EFFECT_COPY}`;
    assert.equal(/message|notified|sent|email|push/iu.test(copy), false);
  });
});

describe("merge Position assignment", () => {
  it("keeps the first Half team's Position and puts the other on the opposite", () => {
    assert.deepEqual(defaultMergePositions({ takenPosition: "left" }), {
      firstPosition: "left",
      secondPosition: "right",
    });
    assert.deepEqual(defaultMergePositions({ takenPosition: "right" }), {
      firstPosition: "right",
      secondPosition: "left",
    });
  });

  it("swaps which User plays left", () => {
    assert.deepEqual(
      swapMergePositions({ firstPosition: "left", secondPosition: "right" }),
      { firstPosition: "right", secondPosition: "left" },
    );
  });

  it("detects a merge that would put both Users on the same Position", () => {
    assert.equal(
      samePositionMerge({ firstPosition: "left", secondPosition: "left" }),
      true,
    );
    assert.equal(
      samePositionMerge({ firstPosition: "left", secondPosition: "right" }),
      false,
    );
  });
});

describe("openPositionLabel", () => {
  it("names the vacant Position", () => {
    assert.equal(openPositionLabel("left"), "Open left");
    assert.equal(openPositionLabel("right"), "Open right");
  });
});
