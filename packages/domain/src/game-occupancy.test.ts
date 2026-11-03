import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  gameOccupancy,
  seatsLeftLabel,
  spotsOpenLabel,
} from "./game-occupancy";

describe("gameOccupancy", () => {
  it("omits occupancy when the Game has no player cap", () => {
    assert.equal(gameOccupancy(3, null), null);
    assert.equal(gameOccupancy(3, undefined), null);
  });

  it("reads as open while more than two seats are vacant", () => {
    assert.deepEqual(gameOccupancy(2, 8), {
      label: "2/8",
      seatsLeft: 6,
      tone: "open",
    });
  });

  it("reads as filling on the last two seats", () => {
    assert.equal(gameOccupancy(6, 8)?.tone, "filling");
    assert.equal(gameOccupancy(7, 8)?.tone, "filling");
  });

  it("reads as full once seats run out", () => {
    assert.deepEqual(gameOccupancy(4, 4), {
      label: "4/4",
      seatsLeft: 0,
      tone: "full",
    });
  });

  it("clamps seats left when registrations exceed the cap", () => {
    assert.deepEqual(gameOccupancy(5, 4), {
      label: "5/4",
      seatsLeft: 0,
      tone: "full",
    });
  });
});

describe("seatsLeftLabel", () => {
  it("keeps the spot count singular for the last seat", () => {
    assert.equal(seatsLeftLabel(1, "en"), "1 spot left");
  });

  it("pluralizes multiple spots", () => {
    assert.equal(seatsLeftLabel(2, "en"), "2 spots left");
  });

  it("uses the Arabic dual and plural", () => {
    assert.equal(seatsLeftLabel(2, "ar"), "بقي مكانان");
    assert.equal(spotsOpenLabel(0, "ar"), "ممتلئة");
  });
});

describe("spotsOpenLabel", () => {
  it("reads as Full when no seats remain", () => {
    assert.equal(spotsOpenLabel(0, "en"), "Full");
  });

  it("uses One spot open for the last vacant seat", () => {
    assert.equal(spotsOpenLabel(1, "en"), "One spot open");
  });

  it("pluralizes multiple open spots", () => {
    assert.equal(spotsOpenLabel(2, "en"), "2 spots open");
  });
});
