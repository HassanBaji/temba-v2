import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  CANCEL_GAME_ACTION,
  EDIT_GAME_ACTION,
  GAME_TOAST,
  JOIN_GAME_ACTION,
  LEAVE_GAME_ACTION,
  LEAVE_GAME_CONSEQUENCE,
  MARK_AS_NOT_PLAYED_CONSEQUENCE,
  REPORT_WRONG_SCORE_CONSEQUENCE,
  REPORT_WRONG_SCORE_LOCKED_CONSEQUENCE,
  cancelGameConsequence,
  gameJoinToast,
  teamRegisterToast,
  kickedToast,
  setLabel,
  setShortLabel,
} from "./game-copy";

describe("cancelGameConsequence", () => {
  it("counts the players who lose the Game", () => {
    assert.equal(
      cancelGameConsequence(4),
      "Removes it from the calendar for all 4 players.",
    );
    assert.equal(
      cancelGameConsequence(2),
      "Removes it from the calendar for all 2 players.",
    );
  });

  it("keeps one player singular", () => {
    assert.equal(
      cancelGameConsequence(1),
      "Removes it from the calendar for 1 player.",
    );
  });

  it("says nobody is affected on an empty Game", () => {
    assert.equal(cancelGameConsequence(0), "Nobody has joined yet.");
  });
});

describe("Game action copy", () => {
  it("writes actions in sentence case with the Game noun capitalised", () => {
    assert.deepEqual(
      [
        JOIN_GAME_ACTION,
        EDIT_GAME_ACTION,
        CANCEL_GAME_ACTION,
        LEAVE_GAME_ACTION,
      ],
      ["Join Game", "Edit Game", "Cancel Game", "Leave Game"],
    );
  });

  it("ends every consequence line with a period", () => {
    for (const line of [
      LEAVE_GAME_CONSEQUENCE,
      MARK_AS_NOT_PLAYED_CONSEQUENCE,
      REPORT_WRONG_SCORE_CONSEQUENCE,
      REPORT_WRONG_SCORE_LOCKED_CONSEQUENCE,
      cancelGameConsequence(3),
    ]) {
      assert.match(line, /\.$/u);
    }
  });

  it("starts every toast with a capital letter", () => {
    for (const toast of Object.values(GAME_TOAST)) {
      assert.match(toast, /^[A-Z]/u);
    }
  });

  it("uses one toast for joining a Game however the seat was taken", () => {
    assert.equal(gameJoinToast(false), "Joined Game");
    assert.equal(gameJoinToast(true), "Joined waitlist");
    assert.equal(teamRegisterToast(false), "Team registered");
    assert.equal(teamRegisterToast(true), "Team joined waitlist");
  });

  it("names who was kicked, matching the Kick confirm", () => {
    assert.equal(kickedToast("Dev"), "Kicked Dev");
  });

  it("numbers Sets from 1", () => {
    assert.equal(setLabel(0), "Set 1");
    assert.equal(setShortLabel(2), "S3");
  });
});
