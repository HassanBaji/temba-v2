import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  isPoolTournament,
  isPartnerRequiredGame,
  poolRoundLabel,
  postedRoundCount,
  roundsPlayedLabel,
  showsPoolTournamentSeats,
  tournamentRoundSchedule,
  tournamentRoundSummary,
} from "./tournament-rounds";
import { fewWeeksRoundStarts } from "./tournament-schedule";
import {
  resolvePlannedRoundCount,
  tournamentMatchMinutes,
} from "./tournament-sizing";

describe("isPoolTournament", () => {
  it("is true only when Friendly tournament has a Pool count", () => {
    assert.equal(isPoolTournament("friendly_tournament", 3), true);
    assert.equal(isPoolTournament("friendly_tournament", null), false);
    assert.equal(isPoolTournament("friendly_game", 3), false);
  });
});

describe("showsPoolTournamentSeats", () => {
  it("is true for an individual Pool tournament", () => {
    assert.equal(
      showsPoolTournamentSeats("friendly_tournament", 3, "individual"),
      true,
    );
  });

  it("is false for team-only, legacy, or other formats", () => {
    assert.equal(
      showsPoolTournamentSeats("friendly_tournament", 3, "team_only"),
      false,
    );
    assert.equal(
      showsPoolTournamentSeats("friendly_tournament", null, "individual"),
      false,
    );
    assert.equal(
      showsPoolTournamentSeats("friendly_game", 3, "individual"),
      false,
    );
  });
});

describe("isPartnerRequiredGame", () => {
  it("is true only for an individual Pool tournament that does not allow registering alone", () => {
    assert.equal(
      isPartnerRequiredGame({
        format: "friendly_tournament",
        poolCount: 3,
        registrationMode: "individual",
        allowSoloRegister: false,
      }),
      true,
    );
  });

  it("is false for allow-alone, leftover Complete Teams, Friendly games, and legacy tournaments", () => {
    assert.equal(
      isPartnerRequiredGame({
        format: "friendly_tournament",
        poolCount: 3,
        registrationMode: "individual",
        allowSoloRegister: true,
      }),
      false,
    );
    assert.equal(
      isPartnerRequiredGame({
        format: "friendly_tournament",
        poolCount: 3,
        registrationMode: "team_only",
        allowSoloRegister: false,
      }),
      false,
    );
    assert.equal(
      isPartnerRequiredGame({
        format: "friendly_game",
        poolCount: null,
        registrationMode: "individual",
        allowSoloRegister: false,
      }),
      false,
    );
    assert.equal(
      isPartnerRequiredGame({
        format: "friendly_tournament",
        poolCount: null,
        registrationMode: "individual",
        allowSoloRegister: false,
      }),
      false,
    );
  });
});

describe("poolRoundLabel", () => {
  it("labels a Round against the tournament total", () => {
    assert.equal(poolRoundLabel(2, 3), "R2 of 3");
  });

  it("is null without a Round number or total", () => {
    assert.equal(poolRoundLabel(null, 3), null);
    assert.equal(poolRoundLabel(2, null), null);
  });
});

describe("roundsPlayedLabel", () => {
  it("counts fully settled Rounds across Pools", () => {
    assert.equal(
      roundsPlayedLabel(
        {
          pools: [
            {
              matches: [
                { roundNumber: 1, status: "completed" },
                { roundNumber: 1, status: "completed" },
                { roundNumber: 2, status: "completed" },
                { roundNumber: 2, status: "scheduled" },
                { roundNumber: 3, status: "scheduled" },
              ],
            },
          ],
        },
        3,
      ),
      "Round 1 of 3 played",
    );
  });

  it("is Round 2 of 3 when two Rounds are fully settled", () => {
    assert.equal(
      roundsPlayedLabel(
        {
          pools: [
            {
              matches: [
                { roundNumber: 1, status: "completed" },
                { roundNumber: 2, cancelled: true },
              ],
            },
            {
              matches: [
                { roundNumber: 1, status: "cancelled" },
                { roundNumber: 2, status: "completed" },
              ],
            },
          ],
        },
        3,
      ),
      "Round 2 of 3 played",
    );
  });

  it("is null without pool tables or a Round count", () => {
    assert.equal(roundsPlayedLabel(null, 3), null);
    assert.equal(roundsPlayedLabel({ pools: [] }, null), null);
  });
});

describe("postedRoundCount", () => {
  it("is the highest posted Round number", () => {
    assert.equal(
      postedRoundCount([
        { roundNumber: 1 },
        { roundNumber: 5 },
        { roundNumber: null },
        { roundNumber: 3 },
      ]),
      5,
    );
  });

  it("is null without posted Pool Matches", () => {
    assert.equal(postedRoundCount([]), null);
    assert.equal(postedRoundCount([{ roundNumber: null }]), null);
  });
});

describe("tournamentRoundSummary", () => {
  it("returns Round count and the first and last Round days for a 12-team tournament", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 9, 11, 19, 0, 0);
    assert.deepEqual(
      tournamentRoundSummary({
        roundCount: resolvePlannedRoundCount(12, 3, null),
        windowStart: start,
        windowEnd: end,
        matchMinutes: null,
      }),
      {
        roundCount: 3,
        dateLines: [formatAbsoluteDay(start), formatAbsoluteDay(end)],
      },
    );
  });

  it("carries an explicit Round count above the suggestion", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 9, 11, 19, 0, 0);
    assert.deepEqual(
      tournamentRoundSummary({
        roundCount: resolvePlannedRoundCount(12, 3, 5),
        windowStart: start,
        windowEnd: end,
        matchMinutes: null,
      }),
      {
        roundCount: 5,
        dateLines: [formatAbsoluteDay(start), formatAbsoluteDay(end)],
      },
    );
  });

  it("keeps a single Round on a few-weeks window to its one date", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 9, 11, 19, 0, 0);
    assert.deepEqual(
      tournamentRoundSummary({
        roundCount: resolvePlannedRoundCount(12, 3, 1),
        windowStart: start,
        windowEnd: end,
        matchMinutes: null,
      }),
      {
        roundCount: 1,
        dateLines: [formatAbsoluteDay(start)],
      },
    );
  });

  it("keeps a one-day tournament to a single date line", () => {
    const start = new Date(2026, 8, 20, 10, 0, 0);
    const end = new Date(2026, 8, 20, 16, 0, 0);
    assert.deepEqual(
      tournamentRoundSummary({
        roundCount: resolvePlannedRoundCount(12, 3, null),
        windowStart: start,
        windowEnd: end,
        matchMinutes: null,
      }),
      {
        roundCount: 3,
        dateLines: [formatAbsoluteDay(start)],
      },
    );
  });

  it("is null for a legacy tournament without Pools", () => {
    assert.equal(
      tournamentRoundSummary({
        roundCount: resolvePlannedRoundCount(12, null, null),
        windowStart: new Date(),
        windowEnd: new Date(),
        matchMinutes: null,
      }),
      null,
    );
  });
});

describe("tournamentRoundSchedule", () => {
  it("steps a one-day window by the Match slot and stays monotonic", () => {
    const windowStart = new Date(2026, 8, 20, 10, 0, 0);
    const windowEnd = new Date(2026, 8, 20, 16, 0, 0);
    const schedule = tournamentRoundSchedule({
      windowStart,
      windowEnd,
      roundCount: 3,
      matchMinutes: null,
    });
    const slotMs = tournamentMatchMinutes(null) * 60 * 1000;
    assert.equal(schedule.length, 3);
    assert.deepEqual(
      schedule.map((round) => round.start.getTime()),
      [
        windowStart.getTime(),
        windowStart.getTime() + slotMs,
        windowStart.getTime() + 2 * slotMs,
      ],
    );
    assert.deepEqual(
      schedule.map((round) => round.roundNumber),
      [1, 2, 3],
    );
    for (let index = 1; index < schedule.length; index += 1) {
      const previous = schedule[index - 1];
      const current = schedule[index];
      assert.ok(previous && current);
      assert.ok(current.start.getTime() > previous.start.getTime());
    }
  });

  it("steps a one-day window by 20, 30, or 45 minutes", () => {
    const windowStart = new Date(2026, 8, 20, 10, 0, 0);
    const windowEnd = new Date(2026, 8, 20, 16, 0, 0);
    for (const minutes of [20, 30, 45, null] as const) {
      const schedule = tournamentRoundSchedule({
        windowStart,
        windowEnd,
        roundCount: 3,
        matchMinutes: minutes,
      });
      const slotMs = tournamentMatchMinutes(minutes) * 60 * 1000;
      assert.deepEqual(
        schedule.map((round) => round.start.getTime()),
        [
          windowStart.getTime(),
          windowStart.getTime() + slotMs,
          windowStart.getTime() + 2 * slotMs,
        ],
      );
    }
  });

  it("dates every Round of an explicit count on both window kinds", () => {
    const roundCount = resolvePlannedRoundCount(12, 3, 5);
    assert.equal(roundCount, 5);
    if (roundCount == null) {
      return;
    }
    const oneDayStart = new Date(2026, 8, 20, 10, 0, 0);
    const oneDay = tournamentRoundSchedule({
      windowStart: oneDayStart,
      windowEnd: new Date(2026, 8, 20, 16, 0, 0),
      roundCount,
      matchMinutes: 30,
    });
    assert.deepEqual(
      oneDay.map((round) => round.roundNumber),
      [1, 2, 3, 4, 5],
    );
    assert.equal(
      oneDay[4]?.start.getTime(),
      oneDayStart.getTime() + 4 * 30 * 60 * 1000,
    );

    const windowStart = new Date("2026-09-20T18:00:00");
    const windowEnd = new Date("2026-10-18T18:45:00");
    const fewWeeks = tournamentRoundSchedule({
      windowStart,
      windowEnd,
      roundCount,
      matchMinutes: null,
    });
    assert.deepEqual(
      fewWeeks.map((round) => round.start.getTime()),
      fewWeeksRoundStarts(windowStart, windowEnd, 5, null).map((start) =>
        start.getTime(),
      ),
    );
    assert.equal(fewWeeks.length, 5);
  });

  it("spreads a multi-week window with fewWeeksRoundStarts and stays monotonic", () => {
    const windowStart = new Date("2026-09-20T18:00:00");
    const windowEnd = new Date("2026-10-04T18:45:00");
    const schedule = tournamentRoundSchedule({
      windowStart,
      windowEnd,
      roundCount: 3,
      matchMinutes: null,
    });
    const expected = fewWeeksRoundStarts(windowStart, windowEnd, 3, null);
    assert.equal(schedule.length, 3);
    assert.equal(schedule.length, expected.length);
    assert.deepEqual(
      schedule.map((round) => round.start.getTime()),
      expected.map((start) => start.getTime()),
    );
    for (let index = 1; index < schedule.length; index += 1) {
      const previous = schedule[index - 1];
      const current = schedule[index];
      assert.ok(previous && current);
      assert.ok(current.start.getTime() > previous.start.getTime());
    }
  });
});
