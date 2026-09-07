import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { flattenSidesToHomeSeats } from "./home-seats";

describe("flattenSidesToHomeSeats", () => {
  it("flattens a 2x2 into four seats and never returns sides", () => {
    const seats = flattenSidesToHomeSeats([
      {
        sideIndex: 0,
        left: { userId: "1", name: "Alex", image: null },
        right: { userId: "2", name: "Sam", image: null },
      },
      {
        sideIndex: 1,
        left: { userId: "3", name: "Riley", image: null },
        right: null,
      },
    ]);
    assert.equal(seats.length, 4);
    assert.equal(seats.filter((seat) => seat.filled).length, 3);
    assert.equal(seats[3]?.filled, false);
    assert.equal(
      seats.every((seat) => !("left" in seat || "right" in seat)),
      true,
    );
  });
});
