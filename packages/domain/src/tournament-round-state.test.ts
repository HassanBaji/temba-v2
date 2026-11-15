import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  allPoolRoundsPosted,
  currentRoundNumber,
  pointsForOutcome,
  poolPoints,
  scoreStandsAt,
  tournamentMatchState,
  tournamentRoundState,
  tournamentScoreOutcome,
  roundCancelCopy,
  tournamentRoundStateLabel,
} from "./tournament-round-state";

const NOW = new Date("2026-11-08T10:10:00Z");

describe("tournamentMatchState", () => {
  const base = {
    status: "pending",
    notFinishedAt: null,
    hasResult: false,
    startTime: "2026-11-08T10:00:00Z",
    now: NOW,
  };

  it("is scheduled before its slot and on court once the slot starts", () => {
    assert.equal(
      tournamentMatchState({ ...base, startTime: "2026-11-08T10:40:00Z" }),
      "scheduled",
    );
    assert.equal(tournamentMatchState(base), "on_court");
  });

  it("waits for the other team once a score is in", () => {
    assert.equal(
      tournamentMatchState({ ...base, hasResult: true }),
      "awaiting_confirmation",
    );
  });

  it("reads confirmed, not finished and cancelled from the Match", () => {
    assert.equal(
      tournamentMatchState({ ...base, status: "completed" }),
      "confirmed",
    );
    assert.equal(
      tournamentMatchState({ ...base, notFinishedAt: NOW }),
      "not_finished",
    );
    assert.equal(
      tournamentMatchState({ ...base, status: "cancelled" }),
      "cancelled",
    );
  });
});

describe("tournamentRoundState", () => {
  it("tells a Round not made from a draft", () => {
    assert.equal(
      tournamentRoundState({ draftCount: 0, matchStates: [] }),
      "not_made",
    );
    assert.equal(
      tournamentRoundState({ draftCount: 4, matchStates: [] }),
      "draft",
    );
  });

  it("is played once every Match is settled", () => {
    assert.equal(
      tournamentRoundState({
        draftCount: 0,
        matchStates: ["confirmed", "not_finished", "cancelled"],
      }),
      "played",
    );
    assert.equal(
      tournamentRoundState({
        draftCount: 0,
        matchStates: ["confirmed", "awaiting_confirmation"],
      }),
      "on_court",
    );
  });

  it("names the first posted Round still being played as current", () => {
    assert.equal(
      currentRoundNumber([
        { roundNumber: 1, state: "played" },
        { roundNumber: 2, state: "on_court" },
        { roundNumber: 3, state: "draft" },
      ]),
      2,
    );
    assert.equal(
      currentRoundNumber([{ roundNumber: 1, state: "draft" }]),
      null,
    );
  });
});

describe("points", () => {
  it("gives 3 for a win, 1 for a draw and 0 for a loss", () => {
    assert.equal(poolPoints({ won: 2, drawn: 1 }), 7);
    assert.equal(pointsForOutcome(tournamentScoreOutcome(6, 4), 1), 3);
    assert.equal(pointsForOutcome(tournamentScoreOutcome(6, 4), 2), 0);
    assert.equal(pointsForOutcome(tournamentScoreOutcome(5, 5), 2), 1);
  });

  it("lets a score stand ten minutes after it is entered", () => {
    assert.equal(
      scoreStandsAt("2026-11-08T10:00:00Z").toISOString(),
      "2026-11-08T10:10:00.000Z",
    );
  });
});

describe("allPoolRoundsPosted", () => {
  it("waits for every Pool Round, ignoring Knockout Matches", () => {
    const matches = [
      { roundNumber: 1, knockoutRound: null },
      { roundNumber: 3, knockoutRound: 1 },
    ];
    assert.equal(allPoolRoundsPosted(matches, 2), false);
    assert.equal(
      allPoolRoundsPosted(
        [...matches, { roundNumber: 2, knockoutRound: null }],
        2,
      ),
      true,
    );
  });
});

describe("a cancelled Round", () => {
  it("is cancelled only when every Match in it is", () => {
    assert.equal(
      tournamentRoundState({
        draftCount: 0,
        matchStates: ["cancelled", "cancelled"],
      }),
      "cancelled",
    );
    assert.equal(
      tournamentRoundState({
        draftCount: 0,
        matchStates: ["cancelled", "confirmed"],
      }),
      "played",
    );
  });

  it("is never the current Round while another posted Round stands", () => {
    assert.equal(
      currentRoundNumber([
        { roundNumber: 1, state: "played" },
        { roundNumber: 2, state: "cancelled" },
        { roundNumber: 3, state: "scheduled" },
      ]),
      3,
    );
    assert.equal(
      currentRoundNumber([
        { roundNumber: 1, state: "played" },
        { roundNumber: 2, state: "cancelled" },
        { roundNumber: 3, state: "not_made" },
      ]),
      1,
    );
    assert.equal(
      currentRoundNumber([{ roundNumber: 1, state: "cancelled" }]),
      1,
    );
  });

  it("is labelled for the Organizer's list", () => {
    assert.equal(tournamentRoundStateLabel("cancelled", "en"), "cancelled");
    assert.equal(tournamentRoundStateLabel("not_made", "en"), "not made yet");
  });
});

describe("roundCancelCopy", () => {
  it("says a Round nobody played comes off the schedule", () => {
    assert.equal(
      roundCancelCopy(
        { roundNumber: 5, cancelEffect: "remove", matches: [] },
        5,
        "en",
      ),
      "Round 5 comes off the schedule. The tournament will have 4 Rounds.",
    );
  });

  it("counts the scores a kept Round loses", () => {
    assert.equal(
      roundCancelCopy(
        {
          roundNumber: 2,
          cancelEffect: "void",
          matches: [
            { state: "confirmed" },
            { state: "awaiting_confirmation" },
            { state: "on_court" },
          ],
        },
        4,
        "en",
      ),
      "Round 2 stays in the list as cancelled. Its 2 scores are discarded: they leave the standings and the players' ratings. This cannot be undone.",
    );
    assert.equal(
      roundCancelCopy(
        {
          roundNumber: 2,
          cancelEffect: "void",
          matches: [{ state: "scheduled" }],
        },
        4,
        "en",
      ),
      "Round 2 stays in the list as cancelled and its games are not played. This cannot be undone.",
    );
  });
});
