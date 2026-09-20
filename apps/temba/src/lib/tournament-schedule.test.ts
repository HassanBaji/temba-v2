import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  circleMethodPairings,
  fewWeeksRoundStarts,
  isOneDayTournamentWindow,
  schedulePoolMatches,
} from "./tournament-schedule";
import { TOURNAMENT_SLOT_MINUTES } from "./tournament-sizing";

describe("circleMethodPairings", () => {
  it("pairs an even Pool so every Game team meets every other once", () => {
    assert.deepEqual(circleMethodPairings(["A", "B", "C", "D"]), [
      { roundNumber: 1, slot1: "A", slot2: "D" },
      { roundNumber: 1, slot1: "B", slot2: "C" },
      { roundNumber: 2, slot1: "A", slot2: "C" },
      { roundNumber: 2, slot1: "D", slot2: "B" },
      { roundNumber: 3, slot1: "A", slot2: "B" },
      { roundNumber: 3, slot1: "C", slot2: "D" },
    ]);
  });

  it("adds a bye Round for an odd Pool and never plays a Game team twice in a Round", () => {
    const pairings = circleMethodPairings(["A", "B", "C"]);
    assert.deepEqual(pairings, [
      { roundNumber: 1, slot1: "B", slot2: "C" },
      { roundNumber: 2, slot1: "A", slot2: "C" },
      { roundNumber: 3, slot1: "A", slot2: "B" },
    ]);
    const byRound = new Map<number, string[]>();
    for (const pairing of pairings) {
      const teams = byRound.get(pairing.roundNumber) ?? [];
      teams.push(pairing.slot1, pairing.slot2);
      byRound.set(pairing.roundNumber, teams);
    }
    for (const teams of byRound.values()) {
      assert.equal(new Set(teams).size, teams.length);
    }
  });
});

describe("isOneDayTournamentWindow", () => {
  it("is one day when start and finish fall on the same local day", () => {
    assert.equal(
      isOneDayTournamentWindow(
        new Date(2026, 8, 20, 10, 0, 0),
        new Date(2026, 8, 20, 16, 0, 0),
      ),
      true,
    );
    assert.equal(
      isOneDayTournamentWindow(
        new Date(2026, 8, 20, 18, 0, 0),
        new Date(2026, 9, 4, 18, 45, 0),
      ),
      false,
    );
  });
});

describe("fewWeeksRoundStarts", () => {
  it("anchors the first and last Rounds to the Game window", () => {
    const starts = fewWeeksRoundStarts(
      new Date("2026-09-20T18:00:00"),
      new Date("2026-10-04T18:45:00"),
      3,
    );
    assert.deepEqual(starts, [
      new Date("2026-09-20T18:00:00"),
      new Date("2026-09-27T18:00:00"),
      new Date("2026-10-04T18:00:00"),
    ]);
  });
});

describe("schedulePoolMatches", () => {
  const court1 = "court-1";
  const court2 = "court-2";
  const teams = ["A", "B", "C", "D"] as const;

  it("lays a one-day even Pool across Courts in 45-minute slots from the start time", () => {
    const scheduled = schedulePoolMatches({
      pools: [{ poolIndex: 1, gameTeamIds: teams }],
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T10:00:00"),
      windowEnd: new Date("2026-09-20T16:00:00"),
    });
    assert.deepEqual(
      scheduled.map((match) => ({
        roundNumber: match.roundNumber,
        startTime: match.startTime,
        courtId: match.courtId,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
      })),
      [
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "D",
        },
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: court2,
          slot1GameTeamId: "B",
          slot2GameTeamId: "C",
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "C",
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: court2,
          slot1GameTeamId: "D",
          slot2GameTeamId: "B",
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "B",
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: court2,
          slot1GameTeamId: "C",
          slot2GameTeamId: "D",
        },
      ],
    );
    assert.equal(
      scheduled[0]?.endTime.getTime() - scheduled[0].startTime.getTime(),
      TOURNAMENT_SLOT_MINUTES * 60 * 1000,
    );
  });

  it("anchors a few-weeks even Pool to each Round's own date and start time", () => {
    const scheduled = schedulePoolMatches({
      pools: [{ poolIndex: 1, gameTeamIds: teams }],
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T18:00:00"),
      windowEnd: new Date("2026-10-04T18:45:00"),
    });
    assert.deepEqual(
      scheduled.map((match) => ({
        roundNumber: match.roundNumber,
        startTime: match.startTime,
        courtId: match.courtId,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
      })),
      [
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T18:00:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "D",
        },
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T18:00:00"),
          courtId: court2,
          slot1GameTeamId: "B",
          slot2GameTeamId: "C",
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-27T18:00:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "C",
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-27T18:00:00"),
          courtId: court2,
          slot1GameTeamId: "D",
          slot2GameTeamId: "B",
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-10-04T18:00:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "B",
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-10-04T18:00:00"),
          courtId: court2,
          slot1GameTeamId: "C",
          slot2GameTeamId: "D",
        },
      ],
    );
  });

  it("schedules odd Pools with byes across Courts in 45-minute Round slots", () => {
    const scheduled = schedulePoolMatches({
      pools: [
        { poolIndex: 1, gameTeamIds: ["A", "B", "C"] },
        { poolIndex: 2, gameTeamIds: ["D", "E", "F"] },
      ],
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T10:00:00"),
      windowEnd: new Date("2026-09-20T16:00:00"),
    });
    assert.deepEqual(
      scheduled.map((match) => ({
        roundNumber: match.roundNumber,
        startTime: match.startTime,
        courtId: match.courtId,
        slot1GameTeamId: match.slot1GameTeamId,
        slot2GameTeamId: match.slot2GameTeamId,
      })),
      [
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: court1,
          slot1GameTeamId: "B",
          slot2GameTeamId: "C",
        },
        {
          roundNumber: 1,
          startTime: new Date("2026-09-20T10:00:00"),
          courtId: court2,
          slot1GameTeamId: "E",
          slot2GameTeamId: "F",
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "C",
        },
        {
          roundNumber: 2,
          startTime: new Date("2026-09-20T10:45:00"),
          courtId: court2,
          slot1GameTeamId: "D",
          slot2GameTeamId: "F",
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: court1,
          slot1GameTeamId: "A",
          slot2GameTeamId: "B",
        },
        {
          roundNumber: 3,
          startTime: new Date("2026-09-20T11:30:00"),
          courtId: court2,
          slot1GameTeamId: "D",
          slot2GameTeamId: "E",
        },
      ],
    );
  });
});
