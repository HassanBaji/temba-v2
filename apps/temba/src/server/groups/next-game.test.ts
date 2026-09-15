import assert from "node:assert/strict";
import { describe, it } from "vitest";

import type { GameListCandidate } from "~/server/home/upcoming-games";

import { nextGameStartTimeByGroup } from "./next-game";

const NOW = new Date("2026-09-15T12:00:00.000Z");
const GROUP_A = "11111111-1111-4111-8111-111111111111";
const GROUP_B = "22222222-2222-4222-8222-222222222222";
const OTHER_GROUP = "33333333-3333-4333-8333-333333333333";

function hoursFromNow(hours: number): Date {
  return new Date(NOW.getTime() + hours * 60 * 60 * 1000);
}

function game(
  overrides: Partial<GameListCandidate> & Pick<GameListCandidate, "id">,
): GameListCandidate {
  return {
    groupId: GROUP_A,
    cancelledAt: null,
    windowStart: hoursFromNow(24),
    windowEnd: hoursFromNow(26),
    createdAt: new Date("2026-09-01T12:00:00.000Z"),
    format: "friendly_game",
    matches: [],
    ...overrides,
  };
}

describe("nextGameStartTimeByGroup", () => {
  it("returns the soonest upcoming Game's start time per Group", () => {
    const soonest = nextGameStartTimeByGroup(
      [
        game({
          id: "a-late",
          windowStart: hoursFromNow(72),
          windowEnd: hoursFromNow(74),
        }),
        game({
          id: "a-soon",
          windowStart: hoursFromNow(5),
          windowEnd: hoursFromNow(7),
        }),
        game({
          id: "b",
          groupId: GROUP_B,
          windowStart: hoursFromNow(30),
          windowEnd: hoursFromNow(32),
        }),
      ],
      new Set([GROUP_A, GROUP_B]),
      NOW,
    );

    assert.deepEqual(soonest.get(GROUP_A), hoursFromNow(5));
    assert.deepEqual(soonest.get(GROUP_B), hoursFromNow(30));
  });

  it("is null for a Group with no upcoming Game", () => {
    const soonest = nextGameStartTimeByGroup(
      [
        game({
          id: "past",
          windowStart: hoursFromNow(-30),
          windowEnd: hoursFromNow(-28),
        }),
        game({
          id: "cancelled",
          cancelledAt: new Date("2026-09-10T12:00:00.000Z"),
        }),
      ],
      new Set([GROUP_A, GROUP_B]),
      NOW,
    );

    assert.equal(soonest.get(GROUP_A), null);
    assert.equal(soonest.get(GROUP_B), null);
  });

  it("returns a null entry for every requested Group when there are no Games", () => {
    const soonest = nextGameStartTimeByGroup(
      [],
      new Set([GROUP_A, GROUP_B]),
      NOW,
    );

    assert.deepEqual([...soonest.keys()], [GROUP_A, GROUP_B]);
    assert.equal(soonest.get(GROUP_A), null);
    assert.equal(soonest.get(GROUP_B), null);
  });

  it("ignores Games on Groups that were not asked for", () => {
    const soonest = nextGameStartTimeByGroup(
      [
        game({ id: "other", groupId: OTHER_GROUP }),
        game({ id: "groupless", groupId: null }),
      ],
      new Set([GROUP_A]),
      NOW,
    );

    assert.deepEqual([...soonest.keys()], [GROUP_A]);
    assert.equal(soonest.get(GROUP_A), null);
  });

  it("falls back to the soonest Match start time when there is no window", () => {
    const soonest = nextGameStartTimeByGroup(
      [
        game({
          id: "matches-only",
          windowStart: null,
          windowEnd: null,
          matches: [
            { startTime: hoursFromNow(48), status: "pending" },
            { startTime: hoursFromNow(12), status: "pending" },
          ],
        }),
      ],
      new Set([GROUP_A]),
      NOW,
    );

    assert.deepEqual(soonest.get(GROUP_A), hoursFromNow(12));
  });
});
