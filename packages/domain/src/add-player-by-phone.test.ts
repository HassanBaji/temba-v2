import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  ADD_PLAYER_LEVEL_CHOICES,
  addPlayerCanSubmit,
  addPlayerCompletePhone,
  addPlayerPreviewLine,
  addPlayerSeatChoices,
  organizerCanAddPlayer,
  sameJoinSeat,
} from "./add-player-by-phone";

const seat = { sideIndex: 1, position: "left" as const };

describe("addPlayerCompletePhone", () => {
  it("returns the E.164 number only once the national part is complete", () => {
    assert.equal(addPlayerCompletePhone("BH", "3612 44"), null);
    assert.equal(addPlayerCompletePhone("BH", "3612 4408"), "+97336124408");
    assert.equal(addPlayerCompletePhone("ZZ", "36124408"), null);
  });
});

describe("addPlayerPreviewLine", () => {
  it("names an account holder, an Unclaimed player and a new number", () => {
    assert.equal(
      addPlayerPreviewLine({
        kind: "account",
        name: "Ahmed Ali",
        alreadyOnGame: false,
      }),
      "This is Ahmed Ali (has an account)",
    );
    assert.equal(
      addPlayerPreviewLine({
        kind: "unclaimed",
        name: "Ali",
        alreadyOnGame: false,
        phoneMasked: "+973 •••• 4408",
      }),
      "Already on Temba as Ali (no account yet)",
    );
    assert.equal(
      addPlayerPreviewLine({ kind: "new", name: null, alreadyOnGame: false }),
      "Not on Temba yet. Add their name and starting Level.",
    );
  });

  it("says when the person is already on the Game", () => {
    assert.equal(
      addPlayerPreviewLine({
        kind: "unclaimed",
        name: "Ali",
        alreadyOnGame: true,
      }),
      "Ali is already on this Game",
    );
  });
});

describe("addPlayerCanSubmit", () => {
  it("needs a preview, a seat and, for a new number, a name", () => {
    const fresh = { kind: "new" as const, name: null, alreadyOnGame: false };
    assert.equal(
      addPlayerCanSubmit({ preview: null, name: "Ali", seat }),
      false,
    );
    assert.equal(
      addPlayerCanSubmit({ preview: fresh, name: " ", seat }),
      false,
    );
    assert.equal(
      addPlayerCanSubmit({ preview: fresh, name: "Ali", seat: null }),
      false,
    );
    assert.equal(
      addPlayerCanSubmit({ preview: fresh, name: "Ali", seat }),
      true,
    );
    assert.equal(
      addPlayerCanSubmit({
        preview: { kind: "account", name: "Ahmed", alreadyOnGame: false },
        name: "",
        seat,
      }),
      true,
    );
    assert.equal(
      addPlayerCanSubmit({
        preview: { kind: "account", name: "Ahmed", alreadyOnGame: true },
        name: "",
        seat,
      }),
      false,
    );
  });
});

describe("addPlayerSeatChoices", () => {
  it("lists each vacant Position with its Team and side", () => {
    assert.deepEqual(
      addPlayerSeatChoices([
        { sideIndex: 1, left: { name: "Sara" }, right: null },
        { sideIndex: 2, left: null, right: null },
      ]).map((choice) => choice.label),
      ["Team A · Right", "Team B · Left", "Team B · Right"],
    );
  });
});

describe("sameJoinSeat", () => {
  it("matches the side and Position", () => {
    assert.equal(sameJoinSeat(seat, { sideIndex: 1, position: "left" }), true);
    assert.equal(
      sameJoinSeat(seat, { sideIndex: 1, position: "right" }),
      false,
    );
    assert.equal(sameJoinSeat(seat, null), false);
  });
});

describe("ADD_PLAYER_LEVEL_CHOICES", () => {
  it("starts with Not sure, then the Onboarding Level bands", () => {
    assert.deepEqual(
      ADD_PLAYER_LEVEL_CHOICES.map((choice) => choice.value),
      ["not_sure", "D", "D+", "C", "C+", "B", "B+", "A"],
    );
  });
});

describe("organizerCanAddPlayer", () => {
  const game = {
    isOrganizer: true,
    cancelledAt: null,
    joinFrozen: false,
    phase: "upcoming",
    format: "friendly_game",
    sport: "padel",
    registrationMode: "individual",
    sides: [
      { sideIndex: 1, left: null, right: null },
      { sideIndex: 2, left: null, right: null },
    ],
  };

  it("offers the add to an Organizer of an open padel Friendly game", () => {
    assert.equal(organizerCanAddPlayer(game), true);
  });

  it("hides it from Members, on finished or full Games and other formats", () => {
    assert.equal(organizerCanAddPlayer({ ...game, isOrganizer: false }), false);
    assert.equal(
      organizerCanAddPlayer({ ...game, cancelledAt: new Date() }),
      false,
    );
    assert.equal(organizerCanAddPlayer({ ...game, phase: "final" }), false);
    assert.equal(organizerCanAddPlayer({ ...game, joinFrozen: true }), false);
    assert.equal(organizerCanAddPlayer({ ...game, sport: "football" }), false);
    assert.equal(
      organizerCanAddPlayer({ ...game, format: "americano" }),
      false,
    );
    assert.equal(
      organizerCanAddPlayer({
        ...game,
        sides: [
          { sideIndex: 1, left: {}, right: {} },
          { sideIndex: 2, left: {}, right: {} },
        ],
      }),
      false,
    );
  });
});
