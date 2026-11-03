import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  cancelGameAction,
  cancelGameConsequence,
  editGameAction,
  gameJoinToast,
  gameToast,
  joinGameAction,
  kickedToast,
  leaveGameAction,
  leaveGameConsequence,
  markAsNotPlayedConsequence,
  reportWrongScoreConsequence,
  reportWrongScoreLockedConsequence,
  setLabel,
  setShortLabel,
  teamRegisterToast,
} from "./game-copy";

describe("cancelGameConsequence", () => {
  it("counts the players who lose the Game", () => {
    assert.equal(
      cancelGameConsequence(4, "en"),
      "Removes it from the calendar for all 4 players.",
    );
    assert.equal(
      cancelGameConsequence(2, "en"),
      "Removes it from the calendar for all 2 players.",
    );
  });

  it("keeps one player singular", () => {
    assert.equal(
      cancelGameConsequence(1, "en"),
      "Removes it from the calendar for 1 player.",
    );
  });

  it("says nobody is affected on an empty Game", () => {
    assert.equal(cancelGameConsequence(0, "en"), "Nobody has joined yet.");
  });

  it("uses the Arabic dual for two players", () => {
    assert.equal(cancelGameConsequence(2, "ar"), "يزيلها من تقويم لاعبَين.");
    assert.equal(cancelGameConsequence(0, "ar"), "لم ينضم أحد بعد.");
  });
});

describe("Game action copy", () => {
  it("writes actions in sentence case with the Game noun capitalised", () => {
    assert.deepEqual(
      [
        joinGameAction("en"),
        editGameAction("en"),
        cancelGameAction("en"),
        leaveGameAction("en"),
      ],
      ["Join Game", "Edit Game", "Cancel Game", "Leave Game"],
    );
  });

  it("ends every consequence line with a period", () => {
    for (const line of [
      leaveGameConsequence("en"),
      markAsNotPlayedConsequence("en"),
      reportWrongScoreConsequence("en"),
      reportWrongScoreLockedConsequence("en"),
      cancelGameConsequence(3, "en"),
    ]) {
      assert.match(line, /\.$/u);
    }
  });

  it("starts every toast with a capital letter", () => {
    for (const toast of Object.values(gameToast("en"))) {
      assert.match(toast, /^[A-Z]/u);
    }
  });

  it("uses one toast for joining a Game however the seat was taken", () => {
    assert.equal(gameJoinToast(false, "en"), "Joined Game");
    assert.equal(gameJoinToast(true, "en"), "Joined waitlist");
    assert.equal(teamRegisterToast(false, "en"), "Team registered");
    assert.equal(teamRegisterToast(true, "en"), "Team joined waitlist");
  });

  it("names who was kicked, matching the Kick confirm", () => {
    assert.equal(kickedToast("Dev", "en"), "Kicked Dev");
  });

  it("numbers Sets from 1", () => {
    assert.equal(setLabel(0, "en"), "Set 1");
    assert.equal(setShortLabel(2, "en"), "S3");
  });

  it("writes the actions, toasts and Set labels in Arabic", () => {
    assert.equal(joinGameAction("ar"), "انضم إلى اللعبة");
    assert.equal(gameJoinToast(true, "ar"), "انضممت إلى قائمة الانتظار");
    assert.equal(kickedToast("Dev", "ar"), "تم إخراج Dev");
    assert.equal(setLabel(0, "ar"), "الشوط 1");
  });
});
