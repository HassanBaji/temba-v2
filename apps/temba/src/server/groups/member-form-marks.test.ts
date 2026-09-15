import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { MatchStatusEnum } from "@repo/db/schema";

import { groupFormMarks, type GroupFormMatch } from "./member-form-marks";

const NOW = new Date("2026-09-15T12:00:00.000Z");
const ALICE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const BOB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CARLA = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const WON_SETS = [
  { slot1GamesWon: 6, slot2GamesWon: 3 },
  { slot1GamesWon: 6, slot2GamesWon: 4 },
];

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

function match(overrides: Partial<GroupFormMatch> = {}): GroupFormMatch {
  return {
    status: MatchStatusEnum.COMPLETED,
    startTime: daysBefore(1),
    createdAt: daysBefore(2),
    slot1UserIds: [ALICE],
    slot2UserIds: [BOB],
    sets: WON_SETS,
    ...overrides,
  };
}

describe("groupFormMarks", () => {
  it("reads each side's result from its slot", () => {
    const matches = [match()];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["won"]);
    assert.deepEqual(groupFormMarks(matches, BOB, NOW), ["lost"]);
  });

  it("returns the last five results, newest last", () => {
    const matches = [
      match({ startTime: daysBefore(6), sets: WON_SETS }),
      match({
        startTime: daysBefore(5),
        slot1UserIds: [BOB],
        slot2UserIds: [ALICE],
      }),
      match({ startTime: daysBefore(4) }),
      match({
        startTime: daysBefore(3),
        slot1UserIds: [BOB],
        slot2UserIds: [ALICE],
      }),
      match({ startTime: daysBefore(2) }),
      match({
        startTime: daysBefore(1),
        slot1UserIds: [BOB],
        slot2UserIds: [ALICE],
      }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), [
      "lost",
      "won",
      "lost",
      "won",
      "lost",
    ]);
  });

  it("orders by when the Match was played, not by input order", () => {
    const matches = [
      match({ startTime: daysBefore(1) }),
      match({
        startTime: daysBefore(3),
        slot1UserIds: [BOB],
        slot2UserIds: [ALICE],
      }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["lost", "won"]);
  });

  it("reads a Match awaiting result confirmation as not-played", () => {
    const matches = [match({ status: MatchStatusEnum.PENDING })];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["not-played"]);
    assert.deepEqual(groupFormMarks(matches, BOB, NOW), ["not-played"]);
  });

  it("reads a played Match with no score as not-played", () => {
    const matches = [
      match({ sets: [{ slot1GamesWon: null, slot2GamesWon: null }] }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["not-played"]);
  });

  it("reads a drawn Match as not-played, since it was neither won nor lost", () => {
    const matches = [
      match({
        sets: [
          { slot1GamesWon: 6, slot2GamesWon: 3 },
          { slot1GamesWon: 4, slot2GamesWon: 6 },
        ],
      }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["not-played"]);
  });

  it("skips a cancelled Match and a Match still to be played", () => {
    const matches = [
      match({ status: MatchStatusEnum.CANCELLED }),
      match({
        status: MatchStatusEnum.PENDING,
        startTime: new Date(NOW.getTime() + 60 * 60 * 1000),
        createdAt: daysBefore(1),
        sets: [],
      }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), []);
  });

  it("counts a completed Match even when its start time is ahead of now", () => {
    const matches = [
      match({ startTime: new Date(NOW.getTime() + 60 * 60 * 1000) }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["won"]);
  });

  it("falls back to when the Match was created if it was never scheduled", () => {
    const matches = [
      match({ startTime: null, createdAt: daysBefore(1) }),
      match({
        startTime: null,
        createdAt: daysBefore(3),
        slot1UserIds: [BOB],
        slot2UserIds: [ALICE],
      }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["lost", "won"]);
  });

  it("never pads a member with fewer than five results", () => {
    const matches = [
      match({ startTime: daysBefore(2) }),
      match({ startTime: daysBefore(1) }),
    ];

    assert.deepEqual(groupFormMarks(matches, ALICE, NOW), ["won", "won"]);
  });

  it("returns no marks for a member with no results", () => {
    assert.deepEqual(groupFormMarks([match()], CARLA, NOW), []);
    assert.deepEqual(groupFormMarks([], ALICE, NOW), []);
  });
});
