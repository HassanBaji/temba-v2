import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareStanding,
  sortStandingMembers,
  standingPosition,
  type StandingMember,
} from "./compare-standing";

function member(
  overrides: Partial<StandingMember> & Pick<StandingMember, "userId" | "name">,
): StandingMember {
  return {
    totalSetsWon: 0,
    totalPointsWon: 0,
    totalGamesPlayed: 0,
    ...overrides,
  };
}

describe("compareStanding", () => {
  it("orders by sets won, then points won, then Games played, then name", () => {
    const sorted = sortStandingMembers([
      member({ userId: "d", name: "Dana", totalSetsWon: 1 }),
      member({ userId: "a", name: "Ava", totalSetsWon: 3, totalPointsWon: 2 }),
      member({ userId: "c", name: "Cara", totalSetsWon: 3, totalPointsWon: 4 }),
      member({
        userId: "b",
        name: "Bea",
        totalSetsWon: 3,
        totalPointsWon: 4,
        totalGamesPlayed: 2,
      }),
      member({
        userId: "e",
        name: "Eve",
        totalSetsWon: 3,
        totalPointsWon: 4,
        totalGamesPlayed: 2,
      }),
    ]);

    assert.deepEqual(
      sorted.map((row) => row.userId),
      ["b", "e", "c", "a", "d"],
    );
  });

  it("breaks remaining ties with case-insensitive name order", () => {
    assert.ok(
      compareStanding(
        member({ userId: "a", name: "alex" }),
        member({ userId: "b", name: "Zoe" }),
      ) < 0,
    );
  });
});

describe("standingPosition", () => {
  it("returns a 1-based position among Group members", () => {
    const sorted = sortStandingMembers([
      member({ userId: "low", name: "Low", totalSetsWon: 0 }),
      member({ userId: "high", name: "High", totalSetsWon: 5 }),
    ]);

    assert.equal(standingPosition(sorted, "high"), 1);
    assert.equal(standingPosition(sorted, "low"), 2);
  });

  it("returns null when the user is not on the leaderboard", () => {
    const sorted = [member({ userId: "in-group", name: "Pat" })];
    assert.equal(standingPosition(sorted, "missing"), null);
  });
});
