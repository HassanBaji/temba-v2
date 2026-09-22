import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  isPoolTournament,
  isPartnerRequiredGame,
  poolRoundLabel,
  roundsPlayedLabel,
  showsPoolTournamentSeats,
  tournamentRoundSchedule,
  tournamentRoundSummary,
} from "./tournament-rounds";
import { fewWeeksRoundStarts } from "./tournament-schedule";
import { TOURNAMENT_SLOT_MINUTES } from "./tournament-sizing";

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

describe("tournamentRoundSummary", () => {
  it("returns Round count and the window dates for a 12-team tournament", () => {
    const start = new Date(2026, 8, 20, 18, 0, 0);
    const end = new Date(2026, 9, 11, 19, 0, 0);
    assert.deepEqual(
      tournamentRoundSummary({
        poolCount: 3,
        teamCount: 12,
        windowStart: start,
        windowEnd: end,
      }),
      {
        roundCount: 3,
        dateLines: [formatAbsoluteDay(start), formatAbsoluteDay(end)],
      },
    );
  });

  it("keeps a one-day tournament to a single date line", () => {
    const start = new Date(2026, 8, 20, 10, 0, 0);
    const end = new Date(2026, 8, 20, 16, 0, 0);
    assert.deepEqual(
      tournamentRoundSummary({
        poolCount: 3,
        teamCount: 12,
        windowStart: start,
        windowEnd: end,
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
        poolCount: null,
        teamCount: 12,
        windowStart: new Date(),
        windowEnd: new Date(),
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
    });
    assert.equal(schedule.length, 3);
    assert.deepEqual(
      schedule.map((round) => round.start.getTime()),
      [
        windowStart.getTime(),
        windowStart.getTime() + TOURNAMENT_SLOT_MINUTES * 60 * 1000,
        windowStart.getTime() + 2 * TOURNAMENT_SLOT_MINUTES * 60 * 1000,
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

  it("spreads a multi-week window with fewWeeksRoundStarts and stays monotonic", () => {
    const windowStart = new Date("2026-09-20T18:00:00");
    const windowEnd = new Date("2026-10-04T18:45:00");
    const schedule = tournamentRoundSchedule({
      windowStart,
      windowEnd,
      roundCount: 3,
    });
    const expected = fewWeeksRoundStarts(windowStart, windowEnd, 3);
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
