import { bahrainDate } from "~/lib/bahrain-date.test-support";
import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  hasKnockout,
  hasPools,
  isDrawnTournament,
  isKnockoutOnly,
  isPartnerRequiredGame,
  plannedKnockoutRoundCount,
  plannedTournamentRoundCount,
  poolRoundLabel,
  postedRoundCount,
  roundsPlayedLabel,
  showsDrawnTournamentSeats,
  tournamentRoundSchedule,
  tournamentRoundSummary,
} from "./tournament-rounds";
import { fewWeeksRoundStarts } from "./tournament-schedule";
import {
  resolvePlannedRoundCount,
  tournamentMatchMinutes,
} from "./tournament-sizing";

describe("hasPools", () => {
  it("is true only when Friendly tournament has a Pool count", () => {
    assert.equal(hasPools("friendly_tournament", 3), true);
    assert.equal(hasPools("friendly_tournament", null), false);
    assert.equal(hasPools("friendly_game", 3), false);
  });
});

describe("isDrawnTournament", () => {
  it("covers Groups only, a null-shape Pool row, and Knockout only", () => {
    assert.equal(isDrawnTournament("friendly_tournament", 3, null), true);
    assert.equal(
      isDrawnTournament("friendly_tournament", 3, "groups_only"),
      true,
    );
    assert.equal(
      isDrawnTournament("friendly_tournament", null, "knockout_only"),
      true,
    );
  });

  it("leaves a legacy hand-built tournament and other formats out", () => {
    assert.equal(isDrawnTournament("friendly_tournament", null, null), false);
    assert.equal(isDrawnTournament("friendly_game", 3, null), false);
    assert.equal(isDrawnTournament("americano", null, "knockout_only"), false);
  });

  it("gives a Knockout only tournament no Pools", () => {
    assert.equal(hasPools("friendly_tournament", null), false);
    assert.equal(isKnockoutOnly("friendly_tournament", "knockout_only"), true);
    assert.equal(isKnockoutOnly("friendly_tournament", "groups_only"), false);
    assert.equal(isKnockoutOnly("friendly_tournament", null), false);
    assert.equal(hasKnockout("friendly_tournament", "knockout_only"), true);
    assert.equal(hasKnockout("friendly_tournament", "groups_only"), false);
    assert.equal(hasKnockout("friendly_tournament", null), false);
  });
});

describe("plannedTournamentRoundCount", () => {
  it("counts the Knockout rounds of the planned field on Knockout only", () => {
    const knockout = {
      format: "friendly_tournament",
      poolCount: null,
      roundCount: null,
      tournamentShape: "knockout_only",
    };
    assert.equal(
      plannedTournamentRoundCount({ ...knockout, teamsAllowed: 4 }),
      2,
    );
    assert.equal(
      plannedTournamentRoundCount({ ...knockout, teamsAllowed: 12 }),
      4,
    );
    assert.equal(
      plannedTournamentRoundCount({ ...knockout, teamsAllowed: 32 }),
      5,
    );
  });

  it("keeps the Pool Round count for Groups only and a null shape", () => {
    for (const tournamentShape of [null, "groups_only"]) {
      assert.equal(
        plannedTournamentRoundCount({
          format: "friendly_tournament",
          teamsAllowed: 12,
          poolCount: 3,
          roundCount: null,
          tournamentShape,
        }),
        resolvePlannedRoundCount(12, 3, null),
      );
    }
  });
});

describe("plannedKnockoutRoundCount", () => {
  const game = {
    format: "friendly_tournament",
    teamsAllowed: 12,
    poolCount: 3,
    qualifiersPerPool: null,
  };

  it("sizes the tree from the field on Knockout only", () => {
    assert.equal(
      plannedKnockoutRoundCount({
        ...game,
        poolCount: null,
        tournamentShape: "knockout_only",
      }),
      4,
    );
  });

  it("sizes the tree from the planned groups and Through from each group", () => {
    const shape = { ...game, tournamentShape: "groups_then_knockout" };
    assert.equal(plannedKnockoutRoundCount(shape), 3);
    assert.equal(
      plannedKnockoutRoundCount({ ...shape, qualifiersPerPool: 1 }),
      2,
    );
    assert.equal(
      plannedKnockoutRoundCount({ ...shape, qualifiersPerPool: 3 }),
      4,
    );
  });

  it("is null without a Knockout", () => {
    assert.equal(
      plannedKnockoutRoundCount({ ...game, tournamentShape: null }),
      null,
    );
    assert.equal(
      plannedKnockoutRoundCount({ ...game, tournamentShape: "groups_only" }),
      null,
    );
  });
});

describe("showsDrawnTournamentSeats", () => {
  it("is true for an individual Pool tournament", () => {
    assert.equal(
      showsDrawnTournamentSeats("friendly_tournament", 3, null, "individual"),
      true,
    );
  });

  it("is false for team-only, legacy, or other formats", () => {
    assert.equal(
      showsDrawnTournamentSeats("friendly_tournament", 3, null, "team_only"),
      false,
    );
    assert.equal(
      showsDrawnTournamentSeats(
        "friendly_tournament",
        null,
        null,
        "individual",
      ),
      false,
    );
    assert.equal(
      showsDrawnTournamentSeats("friendly_game", 3, null, "individual"),
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
    const start = bahrainDate(2026, 8, 20, 18, 0, 0);
    const end = bahrainDate(2026, 9, 11, 19, 0, 0);
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
    const start = bahrainDate(2026, 8, 20, 18, 0, 0);
    const end = bahrainDate(2026, 9, 11, 19, 0, 0);
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
    const start = bahrainDate(2026, 8, 20, 18, 0, 0);
    const end = bahrainDate(2026, 9, 11, 19, 0, 0);
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
    const start = bahrainDate(2026, 8, 20, 10, 0, 0);
    const end = bahrainDate(2026, 8, 20, 16, 0, 0);
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
    const windowStart = bahrainDate(2026, 8, 20, 10, 0, 0);
    const windowEnd = bahrainDate(2026, 8, 20, 16, 0, 0);
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
    const windowStart = bahrainDate(2026, 8, 20, 10, 0, 0);
    const windowEnd = bahrainDate(2026, 8, 20, 16, 0, 0);
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
    const oneDayStart = bahrainDate(2026, 8, 20, 10, 0, 0);
    const oneDay = tournamentRoundSchedule({
      windowStart: oneDayStart,
      windowEnd: bahrainDate(2026, 8, 20, 16, 0, 0),
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

    const windowStart = new Date("2026-09-20T18:00:00+03:00");
    const windowEnd = new Date("2026-10-18T18:45:00+03:00");
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
    const windowStart = new Date("2026-09-20T18:00:00+03:00");
    const windowEnd = new Date("2026-10-04T18:45:00+03:00");
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
