import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  friendlyGameCanKickPlayer,
  friendlyGameOccupantActions,
  friendlyGamePlayersCancelledNote,
  friendlyGameSideFill,
  friendlyGameVacantSeatAction,
  friendlyGameVacantSeatLabel,
} from "./friendly-game-players";

describe("friendlyGameSideFill", () => {
  it("counts Left and Right out of two", () => {
    assert.deepEqual(friendlyGameSideFill({ left: null, right: null }), {
      filled: 0,
      label: "0/2",
    });
    assert.deepEqual(
      friendlyGameSideFill({ left: { userId: "a" }, right: null }),
      { filled: 1, label: "1/2" },
    );
    assert.deepEqual(
      friendlyGameSideFill({
        left: { userId: "a" },
        right: { userId: "b" },
      }),
      { filled: 2, label: "2/2" },
    );
  });
});

describe("friendlyGameVacantSeatAction", () => {
  it("joins through the existing door, including leftover occupy", () => {
    assert.equal(
      friendlyGameVacantSeatAction({
        cancelled: false,
        canMove: false,
        canRegister: true,
        canPickSeat: false,
        canWaitlist: false,
      }),
      "join",
    );
    assert.equal(
      friendlyGameVacantSeatAction({
        cancelled: false,
        canMove: false,
        canRegister: false,
        canPickSeat: true,
        canWaitlist: false,
      }),
      "join",
    );
  });

  it("moves the viewer via a vacant Position", () => {
    assert.equal(
      friendlyGameVacantSeatAction({
        cancelled: false,
        canMove: true,
        canRegister: false,
        canPickSeat: false,
        canWaitlist: false,
      }),
      "move",
    );
  });

  it("is quiet when cancelled, closed, or full with no leftover seat", () => {
    assert.equal(
      friendlyGameVacantSeatAction({
        cancelled: true,
        canMove: true,
        canRegister: true,
        canPickSeat: true,
        canWaitlist: true,
      }),
      null,
    );
    assert.equal(
      friendlyGameVacantSeatAction({
        cancelled: false,
        canMove: false,
        canRegister: false,
        canPickSeat: false,
        canWaitlist: false,
      }),
      null,
    );
  });
});

describe("friendlyGameVacantSeatLabel", () => {
  it("names the vacant Plus as join or self-move", () => {
    assert.equal(
      friendlyGameVacantSeatLabel("join", "Team A", "Left"),
      "Join Team A Left",
    );
    assert.equal(
      friendlyGameVacantSeatLabel("move", "Team B", "Right"),
      "Move to Team B Right",
    );
    assert.equal(friendlyGameVacantSeatLabel(null, "Team A", "Left"), null);
  });
});

describe("friendlyGameOccupantActions", () => {
  it("lets the Organizer Kick others, not self, and not move others", () => {
    assert.deepEqual(
      friendlyGameOccupantActions({
        isOrganizer: true,
        cancelled: false,
        isViewer: false,
      }),
      ["kick"],
    );
    assert.deepEqual(
      friendlyGameOccupantActions({
        isOrganizer: true,
        cancelled: false,
        isViewer: true,
      }),
      [],
    );
    assert.equal(
      friendlyGameCanKickPlayer({
        isOrganizer: true,
        cancelled: false,
        isViewer: true,
      }),
      false,
    );
    assert.deepEqual(
      friendlyGameOccupantActions({
        isOrganizer: false,
        cancelled: false,
        isViewer: false,
      }),
      [],
    );
  });

  it("hides Kick after cancel", () => {
    assert.deepEqual(
      friendlyGameOccupantActions({
        isOrganizer: true,
        cancelled: true,
        isViewer: false,
      }),
      [],
    );
  });
});

describe("friendlyGamePlayersCancelledNote", () => {
  it("notes the cancel without wiping seats", () => {
    assert.equal(
      friendlyGamePlayersCancelledNote(true),
      "This Game was cancelled. Seated people stay listed.",
    );
    assert.equal(friendlyGamePlayersCancelledNote(false), null);
  });
});
