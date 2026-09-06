import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  clampFriendlySetGames,
  friendlyGameResultsCanEnterSets,
  friendlyGameResultsIsPending,
  friendlyGameResultsSaveSets,
  friendlyGameResultsSetWinsDisplay,
  friendlyGameResultsWinnerLine,
  friendlySetGamesDisplay,
  stepFriendlySetGames,
} from "./friendly-game-results";

describe("friendlyGameResultsIsPending", () => {
  it("is pending when no Set has games-won", () => {
    assert.equal(
      friendlyGameResultsIsPending([
        { slot1GamesWon: null, slot2GamesWon: null },
        { slot1GamesWon: null, slot2GamesWon: null },
      ]),
      true,
    );
  });

  it("is not pending once any side has games-won", () => {
    assert.equal(
      friendlyGameResultsIsPending([
        { slot1GamesWon: 6, slot2GamesWon: null },
        { slot1GamesWon: null, slot2GamesWon: null },
      ]),
      false,
    );
  });
});

describe("friendlySetGamesDisplay", () => {
  it("reads unscored games-won as a dash", () => {
    assert.equal(friendlySetGamesDisplay(null), "—");
    assert.equal(friendlySetGamesDisplay(0), "0");
    assert.equal(friendlySetGamesDisplay(7), "7");
  });
});

describe("friendlyGameResultsSetWinsDisplay", () => {
  it("shows dashes for a pending Match", () => {
    assert.deepEqual(friendlyGameResultsSetWinsDisplay(true, 0, 0), {
      slot1: "—",
      slot2: "—",
    });
  });

  it("shows Set-wins once any Set is scored", () => {
    assert.deepEqual(friendlyGameResultsSetWinsDisplay(false, 2, 1), {
      slot1: "2",
      slot2: "1",
    });
  });
});

describe("clampFriendlySetGames and stepFriendlySetGames", () => {
  it("clamps the stepper to 0–7", () => {
    assert.equal(clampFriendlySetGames(-3), 0);
    assert.equal(clampFriendlySetGames(0), 0);
    assert.equal(clampFriendlySetGames(4), 4);
    assert.equal(clampFriendlySetGames(7), 7);
    assert.equal(clampFriendlySetGames(12), 7);
  });

  it("steps from a pending dash onto the 0–7 range", () => {
    assert.equal(stepFriendlySetGames(null, -1), 0);
    assert.equal(stepFriendlySetGames(null, 1), 1);
    assert.equal(stepFriendlySetGames(0, -1), 0);
    assert.equal(stepFriendlySetGames(7, 1), 7);
    assert.equal(stepFriendlySetGames(6, 1), 7);
  });
});

describe("friendlyGameResultsSaveSets", () => {
  it("persists each Set with both sides entered, without clamping", () => {
    assert.deepEqual(
      friendlyGameResultsSaveSets([
        { id: "set-1", slot1: 6, slot2: 4 },
        { id: "set-2", slot1: 3, slot2: null },
        { id: "set-3", slot1: 8, slot2: 0 },
      ]),
      [
        { setId: "set-1", slot1GamesWon: 6, slot2GamesWon: 4 },
        { setId: "set-3", slot1GamesWon: 8, slot2GamesWon: 0 },
      ],
    );
  });

  it("returns only Set scores, so Save does not complete the Match", () => {
    const saved = friendlyGameResultsSaveSets([
      { id: "set-1", slot1: 6, slot2: 4 },
    ]);
    assert.deepEqual(Object.keys(saved[0] ?? {}).sort(), [
      "setId",
      "slot1GamesWon",
      "slot2GamesWon",
    ]);
  });
});

describe("friendlyGameResultsCanEnterSets", () => {
  it("follows canScoreSets and does not widen who may enter", () => {
    assert.equal(
      friendlyGameResultsCanEnterSets({
        gameCancelled: false,
        matchStatus: "confirmed",
        canScoreSets: true,
      }),
      true,
    );
    assert.equal(
      friendlyGameResultsCanEnterSets({
        gameCancelled: false,
        matchStatus: "confirmed",
        canScoreSets: false,
      }),
      false,
    );
  });

  it("is read-only after Complete Match even if the score flag is stale", () => {
    assert.equal(
      friendlyGameResultsCanEnterSets({
        gameCancelled: false,
        matchStatus: "completed",
        canScoreSets: true,
      }),
      false,
    );
  });

  it("refuses score entry on a cancelled Game or Match", () => {
    assert.equal(
      friendlyGameResultsCanEnterSets({
        gameCancelled: true,
        matchStatus: "confirmed",
        canScoreSets: true,
      }),
      false,
    );
    assert.equal(
      friendlyGameResultsCanEnterSets({
        gameCancelled: false,
        matchStatus: "cancelled",
        canScoreSets: true,
      }),
      false,
    );
  });
});

describe("friendlyGameResultsWinnerLine", () => {
  it("uses the existing outcome on a completed Match", () => {
    assert.equal(
      friendlyGameResultsWinnerLine({
        matchStatus: "completed",
        outcomeResult: "slot1",
        slot1Label: "Team A",
        slot2Label: "Team B",
      }),
      "Team A won",
    );
    assert.equal(
      friendlyGameResultsWinnerLine({
        matchStatus: "completed",
        outcomeResult: "slot2",
        slot1Label: "Team A",
        slot2Label: "Team B",
      }),
      "Team B won",
    );
    assert.equal(
      friendlyGameResultsWinnerLine({
        matchStatus: "completed",
        outcomeResult: "draw",
        slot1Label: "Team A",
        slot2Label: "Team B",
      }),
      "Match draw",
    );
  });

  it("marks an unscored live Match as needing a score", () => {
    assert.equal(
      friendlyGameResultsWinnerLine({
        matchStatus: "confirmed",
        outcomeResult: "none",
        slot1Label: "Team A",
        slot2Label: "Team B",
      }),
      "Needs a score",
    );
  });

  it("treats a cancelled Match as cancelled, not entry", () => {
    assert.equal(
      friendlyGameResultsWinnerLine({
        matchStatus: "cancelled",
        outcomeResult: "none",
        slot1Label: "Team A",
        slot2Label: "Team B",
      }),
      "Match cancelled",
    );
  });
});
