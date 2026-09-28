import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  circleMethodPairings,
  fewWeeksRoundStarts,
  isOneDayTournamentWindow,
  poolRoundPairings,
  schedulePoolMatches,
  sizeTournamentRounds,
} from "./tournament-schedule";
import { tournamentMatchMinutes } from "./tournament-sizing";

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
  it("places the last Round one Game length before the finish", () => {
    const windowStart = new Date("2026-09-20T18:00:00");
    const windowEnd = new Date("2026-10-04T18:45:00");
    for (const minutes of [20, 30, 45] as const) {
      const starts = fewWeeksRoundStarts(windowStart, windowEnd, 3, minutes);
      assert.equal(starts[0]?.getTime(), windowStart.getTime());
      assert.equal(
        starts[2]?.getTime(),
        windowEnd.getTime() - minutes * 60 * 1000,
      );
    }
    const fallback = fewWeeksRoundStarts(windowStart, windowEnd, 3, null);
    assert.equal(
      fallback[2]?.getTime(),
      windowEnd.getTime() - tournamentMatchMinutes(null) * 60 * 1000,
    );
  });

  it("anchors the first and last Rounds to the Game window", () => {
    const starts = fewWeeksRoundStarts(
      new Date("2026-09-20T18:00:00"),
      new Date("2026-10-04T18:45:00"),
      3,
      null,
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
      roundCount: 3,
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T10:00:00"),
      windowEnd: new Date("2026-09-20T16:00:00"),
      matchMinutes: null,
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
      tournamentMatchMinutes(null) * 60 * 1000,
    );
  });

  it("steps one-day slots by 20, 30, or 45 minutes", () => {
    const windowStart = new Date("2026-09-20T10:00:00");
    for (const minutes of [20, 30, 45, null] as const) {
      const scheduled = schedulePoolMatches({
        pools: [{ poolIndex: 1, gameTeamIds: teams }],
        roundCount: 3,
        courtIds: [court1, court2],
        windowStart,
        windowEnd: new Date("2026-09-20T16:00:00"),
        matchMinutes: minutes,
      });
      const expected = tournamentMatchMinutes(minutes);
      const roundTwo = scheduled.find((match) => match.roundNumber === 2);
      assert.ok(roundTwo);
      assert.equal(
        roundTwo.startTime.getTime(),
        windowStart.getTime() + expected * 60 * 1000,
      );
      assert.equal(
        scheduled[0]?.endTime.getTime() - scheduled[0].startTime.getTime(),
        expected * 60 * 1000,
      );
    }
  });

  it("anchors a few-weeks even Pool to each Round's own date and start time", () => {
    const scheduled = schedulePoolMatches({
      pools: [{ poolIndex: 1, gameTeamIds: teams }],
      roundCount: 3,
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T18:00:00"),
      windowEnd: new Date("2026-10-04T18:45:00"),
      matchMinutes: null,
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
      roundCount: 3,
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T10:00:00"),
      windowEnd: new Date("2026-09-20T16:00:00"),
      matchMinutes: null,
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

describe("poolRoundPairings", () => {
  const four = ["A", "B", "C", "D"] as const;
  const five = ["A", "B", "C", "D", "E"] as const;

  it("equals one full circle-method Pass at the suggested count", () => {
    assert.deepEqual(
      poolRoundPairings(four, { suggestedRoundCount: 3, roundCount: 3 }),
      circleMethodPairings(four),
    );
    assert.deepEqual(
      poolRoundPairings(five, { suggestedRoundCount: 5, roundCount: 5 }),
      circleMethodPairings(five),
    );
  });

  it("plays the first R Rounds of a full Pass for a partial count", () => {
    const full = circleMethodPairings(five);
    for (const roundCount of [1, 2, 3, 4]) {
      assert.deepEqual(
        poolRoundPairings(five, { suggestedRoundCount: 5, roundCount }),
        full.filter((pairing) => pairing.roundNumber <= roundCount),
      );
    }
  });

  it("repeats Pass 1 in Pass 2 with slot 1 and slot 2 swapped", () => {
    const pairings = poolRoundPairings(four, {
      suggestedRoundCount: 3,
      roundCount: 6,
    });
    const full = circleMethodPairings(four);
    assert.deepEqual(pairings.slice(0, full.length), full);
    assert.deepEqual(
      pairings.slice(full.length),
      full.map((pairing) => ({
        roundNumber: pairing.roundNumber + 3,
        slot1: pairing.slot2,
        slot2: pairing.slot1,
      })),
    );
  });

  it("sits a smaller Pool out of the tail of each Pass", () => {
    const pairings = poolRoundPairings(four, {
      suggestedRoundCount: 5,
      roundCount: 10,
    });
    assert.deepEqual(
      [...new Set(pairings.map((pairing) => pairing.roundNumber))],
      [1, 2, 3, 6, 7, 8],
    );
    const pass2 = pairings.filter((pairing) => pairing.roundNumber >= 6);
    assert.deepEqual(
      pass2,
      circleMethodPairings(four).map((pairing) => ({
        roundNumber: pairing.roundNumber + 5,
        slot1: pairing.slot2,
        slot2: pairing.slot1,
      })),
    );
  });
});

describe("sizeTournamentRounds", () => {
  it("sizes one Pass exactly like today's full round robin", () => {
    assert.deepEqual(sizeTournamentRounds([4, 4, 4], 3), {
      roundCount: 3,
      poolMatches: 18,
      matchesPerTeamMin: 3,
      matchesPerTeamMax: 3,
      meets: "once",
    });
    assert.deepEqual(sizeTournamentRounds([4, 3, 3], 3), {
      roundCount: 3,
      poolMatches: 12,
      matchesPerTeamMin: 2,
      matchesPerTeamMax: 3,
      meets: "once",
    });
  });

  it("counts a partial Pass from the generated pairings", () => {
    assert.deepEqual(sizeTournamentRounds([4], 1), {
      roundCount: 1,
      poolMatches: 2,
      matchesPerTeamMin: 1,
      matchesPerTeamMax: 1,
      meets: "partial",
    });
    assert.deepEqual(sizeTournamentRounds([5, 5, 4], 3), {
      roundCount: 3,
      poolMatches: 18,
      matchesPerTeamMin: 2,
      matchesPerTeamMax: 3,
      meets: "partial",
    });
  });

  it("marks a partial second Pass as some meeting twice", () => {
    assert.deepEqual(sizeTournamentRounds([4], 4), {
      roundCount: 4,
      poolMatches: 8,
      matchesPerTeamMin: 4,
      matchesPerTeamMax: 4,
      meets: "somePartialSecond",
    });
    assert.equal(sizeTournamentRounds([5, 5, 4], 8).meets, "somePartialSecond");
  });

  it("sizes two full Passes as everyone meeting twice", () => {
    assert.deepEqual(sizeTournamentRounds([4, 4, 4], 6), {
      roundCount: 6,
      poolMatches: 36,
      matchesPerTeamMin: 6,
      matchesPerTeamMax: 6,
      meets: "twice",
    });
    assert.deepEqual(sizeTournamentRounds([5, 5, 4], 10), {
      roundCount: 10,
      poolMatches: 52,
      matchesPerTeamMin: 6,
      matchesPerTeamMax: 8,
      meets: "twice",
    });
  });
});

describe("schedulePoolMatches with a chosen Round count", () => {
  const court1 = "court-1";
  const court2 = "court-2";
  const oneDay = {
    courtIds: [court1, court2],
    windowStart: new Date("2026-09-20T10:00:00"),
    windowEnd: new Date("2026-09-20T20:00:00"),
    matchMinutes: null,
  };
  const pools = [
    { poolIndex: 1, gameTeamIds: ["A", "B", "C", "D", "E"] },
    { poolIndex: 2, gameTeamIds: ["F", "G", "H", "I"] },
  ];

  function pairs(scheduled: ReturnType<typeof schedulePoolMatches>) {
    return scheduled.map((match) => ({
      roundNumber: match.roundNumber,
      slot1: match.slot1GameTeamId,
      slot2: match.slot2GameTeamId,
    }));
  }

  it("generates exactly the first R Rounds of the full schedule", () => {
    const full = schedulePoolMatches({ ...oneDay, pools, roundCount: 5 });
    const partial = schedulePoolMatches({ ...oneDay, pools, roundCount: 2 });
    assert.deepEqual(
      partial,
      full.filter((match) => match.roundNumber <= 2),
    );
    assert.deepEqual(
      [...new Set(partial.map((match) => match.roundNumber))],
      [1, 2],
    );
  });

  it("leaves the smaller Pool without Matches in the Rounds it sits out", () => {
    const scheduled = schedulePoolMatches({ ...oneDay, pools, roundCount: 5 });
    const smaller = new Set(["F", "G", "H", "I"]);
    for (const match of scheduled) {
      if (match.roundNumber > 3) {
        assert.equal(smaller.has(match.slot1GameTeamId), false);
        assert.equal(smaller.has(match.slot2GameTeamId), false);
      }
    }
    assert.equal(
      scheduled.filter((match) => smaller.has(match.slot1GameTeamId)).length,
      6,
    );
  });

  it("starts both Pools' second Pass together with swapped slots", () => {
    const scheduled = schedulePoolMatches({ ...oneDay, pools, roundCount: 10 });
    const first = pairs(scheduled).filter((match) => match.roundNumber <= 5);
    const second = pairs(scheduled).filter((match) => match.roundNumber > 5);
    assert.deepEqual(
      second,
      first.map((match) => ({
        roundNumber: match.roundNumber + 5,
        slot1: match.slot2,
        slot2: match.slot1,
      })),
    );
    assert.equal(scheduled.length, 32);
  });

  it("spreads a few-weeks window across the chosen Round count", () => {
    const scheduled = schedulePoolMatches({
      pools: [{ poolIndex: 1, gameTeamIds: ["A", "B", "C", "D"] }],
      roundCount: 6,
      courtIds: [court1, court2],
      windowStart: new Date("2026-09-20T18:00:00"),
      windowEnd: new Date("2026-10-10T18:45:00"),
      matchMinutes: null,
    });
    const starts = [
      ...new Set(scheduled.map((match) => match.startTime.getTime())),
    ].map((time) => new Date(time));
    assert.deepEqual(starts, [
      new Date("2026-09-20T18:00:00"),
      new Date("2026-09-24T18:00:00"),
      new Date("2026-09-28T18:00:00"),
      new Date("2026-10-02T18:00:00"),
      new Date("2026-10-06T18:00:00"),
      new Date("2026-10-10T18:00:00"),
    ]);
  });
});
