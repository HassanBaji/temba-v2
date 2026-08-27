import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  filterAndSortHomeUpcomingGames,
  isHomeUpcomingGame,
  type HomeUpcomingGameCandidate,
} from "./upcoming-games";

const now = new Date("2026-08-27T12:00:00.000Z");
const memberGroupIds = new Set(["group-a", "group-b"]);

function game(
  overrides: Partial<HomeUpcomingGameCandidate> &
    Pick<HomeUpcomingGameCandidate, "id">,
): HomeUpcomingGameCandidate {
  return {
    groupId: "group-a",
    status: "pending",
    startTime: new Date("2026-08-27T13:00:00.000Z"),
    ...overrides,
  };
}

describe("isHomeUpcomingGame", () => {
  it("keeps pending and confirmed Games in a member Group at or after now", () => {
    assert.equal(
      isHomeUpcomingGame(game({ id: "pending" }), memberGroupIds, now),
      true,
    );
    assert.equal(
      isHomeUpcomingGame(
        game({ id: "confirmed", status: "confirmed" }),
        memberGroupIds,
        now,
      ),
      true,
    );
    assert.equal(
      isHomeUpcomingGame(
        game({ id: "now", startTime: now }),
        memberGroupIds,
        now,
      ),
      true,
    );
  });

  it("drops public pickup, other Groups, past startTime, and other statuses", () => {
    assert.equal(
      isHomeUpcomingGame(
        game({ id: "pickup", groupId: null }),
        memberGroupIds,
        now,
      ),
      false,
    );
    assert.equal(
      isHomeUpcomingGame(
        game({ id: "other", groupId: "group-z" }),
        memberGroupIds,
        now,
      ),
      false,
    );
    assert.equal(
      isHomeUpcomingGame(
        game({
          id: "past",
          startTime: new Date("2026-08-27T11:59:59.000Z"),
        }),
        memberGroupIds,
        now,
      ),
      false,
    );
    assert.equal(
      isHomeUpcomingGame(
        game({ id: "completed", status: "completed" }),
        memberGroupIds,
        now,
      ),
      false,
    );
    assert.equal(
      isHomeUpcomingGame(
        game({ id: "cancelled", status: "cancelled" }),
        memberGroupIds,
        now,
      ),
      false,
    );
  });
});

describe("filterAndSortHomeUpcomingGames", () => {
  it("returns only matching Games soonest first", () => {
    const later = game({
      id: "later",
      startTime: new Date("2026-08-28T10:00:00.000Z"),
    });
    const sooner = game({
      id: "sooner",
      startTime: new Date("2026-08-27T14:00:00.000Z"),
    });
    const pickup = game({ id: "pickup", groupId: null });

    const sorted = filterAndSortHomeUpcomingGames(
      [later, pickup, sooner],
      memberGroupIds,
      now,
    );

    assert.deepEqual(
      sorted.map((row) => row.id),
      ["sooner", "later"],
    );
  });
});
