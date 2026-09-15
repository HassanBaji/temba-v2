import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { MatchStatusEnum } from "@repo/db/schema";

import { groupMemberWinLoss, type GroupWinLossMatch } from "./member-win-loss";

const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CARLA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

function match(overrides: Partial<GroupWinLossMatch> = {}): GroupWinLossMatch {
  return {
    status: MatchStatusEnum.COMPLETED,
    slot1UserIds: [ALICE],
    slot2UserIds: [BOB],
    sets: [
      { slot1GamesWon: 6, slot2GamesWon: 3 },
      { slot1GamesWon: 6, slot2GamesWon: 4 },
    ],
    ...overrides,
  };
}

describe("groupMemberWinLoss", () => {
  it("tallies a completed Match against each side's slot", () => {
    const records = groupMemberWinLoss([match()], [ALICE, BOB]);

    assert.deepEqual(records.get(ALICE), { wins: 1, losses: 0 });
    assert.deepEqual(records.get(BOB), { wins: 0, losses: 1 });
  });

  it("counts a drawn Match as neither a win nor a loss", () => {
    const records = groupMemberWinLoss(
      [
        match({
          sets: [
            { slot1GamesWon: 6, slot2GamesWon: 3 },
            { slot1GamesWon: 4, slot2GamesWon: 6 },
          ],
        }),
      ],
      [ALICE, BOB],
    );

    assert.deepEqual(records.get(ALICE), { wins: 0, losses: 0 });
    assert.deepEqual(records.get(BOB), { wins: 0, losses: 0 });
  });

  it("ignores a Match awaiting result confirmation", () => {
    const records = groupMemberWinLoss(
      [match({ status: MatchStatusEnum.PENDING })],
      [ALICE, BOB],
    );

    assert.deepEqual(records.get(ALICE), { wins: 0, losses: 0 });
    assert.deepEqual(records.get(BOB), { wins: 0, losses: 0 });
  });

  it("ignores a cancelled Match and a completed Match with no score", () => {
    const records = groupMemberWinLoss(
      [
        match({ status: MatchStatusEnum.CANCELLED }),
        match({ sets: [{ slot1GamesWon: null, slot2GamesWon: null }] }),
      ],
      [ALICE, BOB],
    );

    assert.deepEqual(records.get(ALICE), { wins: 0, losses: 0 });
    assert.deepEqual(records.get(BOB), { wins: 0, losses: 0 });
  });

  it("adds up results across Matches and sides", () => {
    const records = groupMemberWinLoss(
      [
        match(),
        match({ slot1UserIds: [BOB], slot2UserIds: [ALICE] }),
        match({ slot1UserIds: [ALICE, CARLA], slot2UserIds: [BOB] }),
      ],
      [ALICE, BOB, CARLA],
    );

    assert.deepEqual(records.get(ALICE), { wins: 2, losses: 1 });
    assert.deepEqual(records.get(BOB), { wins: 1, losses: 2 });
    assert.deepEqual(records.get(CARLA), { wins: 1, losses: 0 });
  });

  it("skips a member seated on both slots of the same Match", () => {
    const records = groupMemberWinLoss(
      [match({ slot1UserIds: [ALICE], slot2UserIds: [ALICE] })],
      [ALICE],
    );

    assert.deepEqual(records.get(ALICE), { wins: 0, losses: 0 });
  });

  it("returns 0-0 for every member of a Group with no Games", () => {
    const records = groupMemberWinLoss([], [ALICE, BOB]);

    assert.deepEqual([...records.keys()], [ALICE, BOB]);
    assert.deepEqual(records.get(ALICE), { wins: 0, losses: 0 });
    assert.deepEqual(records.get(BOB), { wins: 0, losses: 0 });
  });

  it("returns nothing for no members", () => {
    assert.equal(groupMemberWinLoss([match()], []).size, 0);
  });
});
