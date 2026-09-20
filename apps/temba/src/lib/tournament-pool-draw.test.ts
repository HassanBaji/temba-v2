import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  DRAW_AGAIN_ACTION,
  DRAW_POOLS_ACTION,
  OPPONENTS_UNKNOWN_COPY,
  POOL_DRAW_NOT_HAPPENED_COPY,
  POOL_DRAW_RANDOM_COPY,
  draftPoolsFromGameTeams,
  hasDraftPoolDraw,
  poolLabel,
} from "./tournament-pool-draw";

describe("Pool draw copy", () => {
  it("tells a User the Pool draw has not happened, opponents are unknown, and it is random", () => {
    assert.equal(
      POOL_DRAW_NOT_HAPPENED_COPY,
      "The Pool draw has not happened yet.",
    );
    assert.equal(OPPONENTS_UNKNOWN_COPY, "Your opponents are not yet known.");
    assert.equal(
      POOL_DRAW_RANDOM_COPY,
      "The Pool draw is random. Nobody is seeded.",
    );
    assert.match(POOL_DRAW_RANDOM_COPY, /random/iu);
    assert.match(POOL_DRAW_RANDOM_COPY, /seeded/iu);
  });

  it("names the Organizer actions without promising a post", () => {
    assert.equal(DRAW_POOLS_ACTION, "Draw the Pools");
    assert.equal(DRAW_AGAIN_ACTION, "Draw again");
  });
});

describe("draftPoolsFromGameTeams", () => {
  it("groups Game teams by Pool with the tournament date and Courts", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 8, 20, 21, 0, 0);
    const pools = draftPoolsFromGameTeams({
      gameTeams: [
        {
          id: "b",
          name: null,
          sideIndex: 2,
          poolIndex: 1,
          members: [{ name: "Sofia" }, { name: "Jonas" }],
        },
        {
          id: "a",
          name: null,
          sideIndex: 1,
          poolIndex: 1,
          members: [{ name: "Ada" }, { name: "Lin" }],
        },
        {
          id: "c",
          name: null,
          sideIndex: 3,
          poolIndex: 2,
          members: [{ name: "Kai" }, { name: "Noor" }],
        },
      ],
      poolCount: 2,
      teamCount: 8,
      windowStart: start,
      windowEnd: end,
      courtNames: ["Court 1", "Court 2"],
    });

    assert.deepEqual(pools, [
      {
        poolIndex: 1,
        label: "Pool 1",
        teams: [
          { id: "a", name: "Ada / Lin" },
          { id: "b", name: "Sofia / Jonas" },
        ],
        dateLines: [formatAbsoluteDay(start)],
        courtNames: ["Court 1", "Court 2"],
      },
      {
        poolIndex: 2,
        label: "Pool 2",
        teams: [{ id: "c", name: "Kai / Noor" }],
        dateLines: [formatAbsoluteDay(start)],
        courtNames: ["Court 1", "Court 2"],
      },
    ]);
    assert.equal(poolLabel(3), "Pool 3");
  });

  it("treats a tournament as undrawn until a Pool index is set", () => {
    assert.equal(
      hasDraftPoolDraw([{ poolIndex: null }, { poolIndex: undefined }]),
      false,
    );
    assert.equal(hasDraftPoolDraw([{ poolIndex: 1 }]), true);
    assert.deepEqual(
      draftPoolsFromGameTeams({
        gameTeams: [
          {
            id: "a",
            name: null,
            sideIndex: 1,
            poolIndex: null,
            members: [{ name: "Ada" }, { name: "Lin" }],
          },
        ],
        poolCount: 1,
        teamCount: 4,
        windowStart: new Date(),
        windowEnd: new Date(),
        courtNames: ["Court 1"],
      }),
      [],
    );
  });
});
