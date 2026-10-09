import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  UNTOUCHED_SELECTION,
  digitsOnly,
  draftsFromSets,
  isFriendlyGameDetails,
  pickedSeat,
  setsToSave,
  togglePickedSeat,
  withDraftChange,
} from "./details-model";

const sides = [
  { sideIndex: 1, left: { name: "A" }, right: null },
  { sideIndex: 2, left: null, right: null },
];

describe("isFriendlyGameDetails", () => {
  it("accepts an individual Friendly game", () => {
    assert.equal(
      isFriendlyGameDetails({
        format: "friendly_game",
        poolCount: null,
        tournamentShape: null,
        registrationMode: "individual",
      }),
      true,
    );
  });

  it("leaves a Friendly tournament for its own screen", () => {
    assert.equal(
      isFriendlyGameDetails({
        format: "friendly_tournament",
        poolCount: 2,
        tournamentShape: null,
        registrationMode: "individual",
      }),
      false,
    );
  });
});

describe("seat selection", () => {
  it("defaults to a seat until the viewer taps", () => {
    const seat = pickedSeat(UNTOUCHED_SELECTION, sides, "right");
    assert.deepEqual(seat, { sideIndex: 1, position: "right" });
  });

  it("keeps the viewer's choice, including clearing it", () => {
    const first = pickedSeat(UNTOUCHED_SELECTION, sides, "right");
    assert.notEqual(first, null);
    const cleared = togglePickedSeat(first, first!);
    assert.deepEqual(cleared, { touched: true, seat: null });
    assert.equal(pickedSeat(cleared, sides, "left"), null);
  });

  it("picks another seat on tap", () => {
    const next = togglePickedSeat(null, { sideIndex: 2, position: "left" });
    assert.deepEqual(next, {
      touched: true,
      seat: { sideIndex: 2, position: "left" },
    });
  });
});

describe("score drafts", () => {
  const sets = [
    { id: "s1", slot1GamesWon: 6, slot2GamesWon: null },
    { id: "s2", slot1GamesWon: null, slot2GamesWon: null },
  ];

  it("starts from the saved values", () => {
    assert.deepEqual(draftsFromSets(sets), {
      s1: { slot1: "6", slot2: "" },
      s2: { slot1: "", slot2: "" },
    });
  });

  it("keeps only digits as the player types", () => {
    assert.equal(digitsOnly("1a2-"), "12");
  });

  it("does not clamp: a value above 7 goes to the server to refuse", () => {
    const drafts = withDraftChange(draftsFromSets(sets), sets[0]!, 2, "8");
    assert.deepEqual(setsToSave(sets, drafts), [
      { setId: "s1", slot1GamesWon: 6, slot2GamesWon: 8 },
    ]);
  });

  it("skips Sets that still lack a side, and saves complete ones", () => {
    let drafts = withDraftChange(draftsFromSets(sets), sets[1]!, 1, "6");
    assert.deepEqual(setsToSave(sets, drafts), []);
    drafts = withDraftChange(drafts, sets[1]!, 2, "4");
    assert.deepEqual(setsToSave(sets, drafts), [
      { setId: "s2", slot1GamesWon: 6, slot2GamesWon: 4 },
    ]);
  });

  it("treats a cleared box as the saved value, as the web score section does", () => {
    const drafts = withDraftChange(draftsFromSets(sets), sets[0]!, 1, "");
    assert.deepEqual(setsToSave(sets, drafts), []);
  });
});
