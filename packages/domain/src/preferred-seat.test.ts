import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  defaultJoinSeat,
  preferredJoinSeat,
  remainingJoinSeatOnSide,
} from "./preferred-seat";

type Occupant = { name: string };

function side(
  sideIndex: number,
  left: Occupant | null,
  right: Occupant | null,
) {
  return { sideIndex, left, right };
}

const someone: Occupant = { name: "Ada" };

/** Two Game teams, every Position free. */
const emptyCourt = [side(0, null, null), side(1, null, null)];

describe("preferredJoinSeat", () => {
  it("pre-selects a free left Position for a left Preferred Position", () => {
    assert.deepEqual(preferredJoinSeat(emptyCourt, "left"), {
      sideIndex: 0,
      position: "left",
    });
  });

  it("pre-selects a free right Position for a right Preferred Position", () => {
    assert.deepEqual(preferredJoinSeat(emptyCourt, "right"), {
      sideIndex: 0,
      position: "right",
    });
  });

  it("pre-selects nothing for Either — it is an answer, and the answer is no side", () => {
    assert.equal(preferredJoinSeat(emptyCourt, "either"), null);
  });

  it("pre-selects nothing when Preferred Position is unanswered", () => {
    assert.equal(preferredJoinSeat(emptyCourt, null), null);
    assert.equal(preferredJoinSeat(emptyCourt, undefined), null);
  });

  it("pre-selects nothing for a value outside the enum", () => {
    assert.equal(preferredJoinSeat(emptyCourt, "middle"), null);
    assert.equal(preferredJoinSeat(emptyCourt, ""), null);
  });

  it("skips a taken matching Position for a free one on the other Game team", () => {
    const sides = [side(0, someone, null), side(1, null, null)];

    assert.deepEqual(preferredJoinSeat(sides, "left"), {
      sideIndex: 1,
      position: "left",
    });
  });

  it("pre-selects nothing when every matching Position is taken", () => {
    const sides = [side(0, someone, null), side(1, someone, null)];

    assert.equal(preferredJoinSeat(sides, "left"), null);
  });

  it("never offers the other Position when the preferred one is taken", () => {
    const sides = [side(0, someone, null)];

    assert.equal(preferredJoinSeat(sides, "left"), null);
  });

  it("pre-selects nothing on a full Game", () => {
    const sides = [side(0, someone, someone), side(1, someone, someone)];

    assert.equal(preferredJoinSeat(sides, "left"), null);
    assert.equal(preferredJoinSeat(sides, "right"), null);
    assert.equal(preferredJoinSeat(sides, "either"), null);
  });

  it("pre-selects nothing when there are no Game teams to pick from", () => {
    assert.equal(preferredJoinSeat([], "left"), null);
  });

  it("keeps to the preferred Position when only the opposite one is free on the first team", () => {
    const sides = [side(0, someone, null), side(1, null, someone)];

    assert.deepEqual(preferredJoinSeat(sides, "left"), {
      sideIndex: 1,
      position: "left",
    });
    assert.deepEqual(preferredJoinSeat(sides, "right"), {
      sideIndex: 0,
      position: "right",
    });
  });

  it("reads sides in the order given rather than by sideIndex value", () => {
    const sides = [side(3, null, null), side(1, null, null)];

    assert.deepEqual(preferredJoinSeat(sides, "right"), {
      sideIndex: 3,
      position: "right",
    });
  });
});

describe("remainingJoinSeatOnSide", () => {
  it("chooses the open Position on a Half team", () => {
    assert.deepEqual(remainingJoinSeatOnSide(side(7, someone, null)), {
      sideIndex: 7,
      position: "right",
    });
    assert.deepEqual(remainingJoinSeatOnSide(side(7, null, someone)), {
      sideIndex: 7,
      position: "left",
    });
  });

  it("is null when both Positions are open or both are taken", () => {
    assert.equal(remainingJoinSeatOnSide(side(1, null, null)), null);
    assert.equal(remainingJoinSeatOnSide(side(1, someone, someone)), null);
  });
});

describe("defaultJoinSeat", () => {
  it("chooses the last open Position rather than asking", () => {
    const sides = [side(1, someone, someone), side(2, someone, null)];
    assert.deepEqual(defaultJoinSeat(sides, "left"), {
      sideIndex: 2,
      position: "right",
    });
    assert.deepEqual(defaultJoinSeat(sides, "either"), {
      sideIndex: 2,
      position: "right",
    });
  });

  it("uses Preferred Position when more than one Position is open", () => {
    assert.deepEqual(defaultJoinSeat(emptyCourt, "right"), {
      sideIndex: 0,
      position: "right",
    });
  });

  it("does not force the other Position when the preferred one is still free elsewhere", () => {
    const sides = [side(1, someone, null), side(2, null, null)];
    assert.deepEqual(defaultJoinSeat(sides, "left"), {
      sideIndex: 2,
      position: "left",
    });
  });
});
