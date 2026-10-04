import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { MatchStatusEnum } from "@repo/db/schema";

import {
  groupMemberStandingRecords,
  type GroupStandingMatch,
} from "./group-standing";

const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CARLA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function match(
  overrides: Partial<GroupStandingMatch> = {},
): GroupStandingMatch {
  return {
    gameId: "game-1",
    status: MatchStatusEnum.COMPLETED,
    slot1UserIds: [ALICE],
    slot2UserIds: [BOB],
    sets: [
      { slot1GamesWon: 6, slot2GamesWon: 3 },
      { slot1GamesWon: 4, slot2GamesWon: 6 },
      { slot1GamesWon: 6, slot2GamesWon: 2 },
    ],
    ...overrides,
  };
}

describe("groupMemberStandingRecords", () => {
  it("sums Sets won, points won and Games played per side", () => {
    const records = groupMemberStandingRecords([match()], [ALICE, BOB]);

    assert.deepEqual(records.get(ALICE), {
      totalSetsWon: 2,
      totalPointsWon: 16,
      totalGamesPlayed: 1,
    });
    assert.deepEqual(records.get(BOB), {
      totalSetsWon: 1,
      totalPointsWon: 11,
      totalGamesPlayed: 1,
    });
  });

  it("counts a Game once however many completed Matches the member sat in", () => {
    const records = groupMemberStandingRecords(
      [match(), match({ slot1UserIds: [BOB], slot2UserIds: [ALICE] })],
      [ALICE],
    );

    assert.equal(records.get(ALICE)?.totalGamesPlayed, 1);
    assert.equal(records.get(ALICE)?.totalSetsWon, 3);
  });

  it("counts each Game separately", () => {
    const records = groupMemberStandingRecords(
      [match(), match({ gameId: "game-2" })],
      [ALICE],
    );

    assert.equal(records.get(ALICE)?.totalGamesPlayed, 2);
  });

  it("ignores Matches that are not completed, including a Walkover", () => {
    const records = groupMemberStandingRecords(
      [
        match({ status: MatchStatusEnum.PENDING }),
        match({ status: MatchStatusEnum.CANCELLED, sets: [] }),
      ],
      [ALICE, BOB],
    );

    for (const id of [ALICE, BOB]) {
      assert.deepEqual(records.get(id), {
        totalSetsWon: 0,
        totalPointsWon: 0,
        totalGamesPlayed: 0,
      });
    }
  });

  it("skips unscored Sets and gives unseated members zeros", () => {
    const records = groupMemberStandingRecords(
      [match({ sets: [{ slot1GamesWon: 6, slot2GamesWon: null }] })],
      [ALICE, CARLA],
    );

    assert.deepEqual(records.get(ALICE), {
      totalSetsWon: 0,
      totalPointsWon: 0,
      totalGamesPlayed: 1,
    });
    assert.deepEqual(records.get(CARLA), {
      totalSetsWon: 0,
      totalPointsWon: 0,
      totalGamesPlayed: 0,
    });
  });
});
