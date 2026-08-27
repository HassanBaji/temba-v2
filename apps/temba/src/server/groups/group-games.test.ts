import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GROUP_GAME_HISTORY_LIMIT,
  filterAndSortGroupGameHistory,
  isGroupGameHistory,
  isGroupUpcomingGame,
  type GroupGameCandidate,
} from "./group-games";

const now = new Date("2026-08-27T12:00:00.000Z");
const groupId = "group-a";

function game(
  overrides: Partial<GroupGameCandidate> & Pick<GroupGameCandidate, "id">,
): GroupGameCandidate {
  return {
    groupId,
    status: "pending",
    startTime: new Date("2026-08-27T13:00:00.000Z"),
    ...overrides,
  };
}

describe("isGroupUpcomingGame", () => {
  it("uses Home upcoming rules scoped to this Group", () => {
    assert.equal(isGroupUpcomingGame(game({ id: "ok" }), groupId, now), true);
    assert.equal(
      isGroupUpcomingGame(
        game({ id: "other", groupId: "group-b" }),
        groupId,
        now,
      ),
      false,
    );
    assert.equal(
      isGroupUpcomingGame(game({ id: "pickup", groupId: null }), groupId, now),
      false,
    );
  });
});

describe("isGroupGameHistory", () => {
  it("includes past startTime or completed/cancelled in this Group", () => {
    assert.equal(
      isGroupGameHistory(
        game({
          id: "past-pending",
          startTime: new Date("2026-08-27T11:00:00.000Z"),
        }),
        groupId,
        now,
      ),
      true,
    );
    assert.equal(
      isGroupGameHistory(
        game({
          id: "future-completed",
          status: "completed",
          startTime: new Date("2026-08-28T10:00:00.000Z"),
        }),
        groupId,
        now,
      ),
      true,
    );
    assert.equal(
      isGroupGameHistory(
        game({
          id: "future-cancelled",
          status: "cancelled",
          startTime: new Date("2026-08-28T10:00:00.000Z"),
        }),
        groupId,
        now,
      ),
      true,
    );
  });

  it("excludes upcoming Games, other Groups, and Games without a groupId", () => {
    assert.equal(
      isGroupGameHistory(game({ id: "upcoming" }), groupId, now),
      false,
    );
    assert.equal(
      isGroupGameHistory(
        game({ id: "other", groupId: "group-b", status: "completed" }),
        groupId,
        now,
      ),
      false,
    );
    assert.equal(
      isGroupGameHistory(
        game({ id: "pickup", groupId: null, status: "completed" }),
        groupId,
        now,
      ),
      false,
    );
  });
});

describe("filterAndSortGroupGameHistory", () => {
  it("returns newest first and caps at about 20", () => {
    const rows = Array.from({ length: 22 }, (_, index) =>
      game({
        id: `past-${index}`,
        status: "completed",
        startTime: new Date(now.getTime() - (index + 1) * 60_000),
      }),
    );

    const history = filterAndSortGroupGameHistory(rows, groupId, now);

    assert.equal(history.length, GROUP_GAME_HISTORY_LIMIT);
    assert.equal(history[0]?.id, "past-0");
    assert.equal(history[19]?.id, "past-19");
  });
});
