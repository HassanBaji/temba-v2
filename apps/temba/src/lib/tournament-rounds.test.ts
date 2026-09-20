import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { formatAbsoluteDay } from "./format-game-start";
import {
  isPoolTournament,
  poolRoundLabel,
  roundsPlayedLabel,
  showsPoolTournamentSeats,
  tournamentRoundSummary,
} from "./tournament-rounds";

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
