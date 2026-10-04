import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  flattenSidesToHomeSeats,
  homeNextGameSeats,
  homeSpotsOpenLabel,
} from "./home-seats";

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
    assert.equal(seats[0]?.sideLabel, "A");
    assert.equal(seats[1]?.sideLabel, "A");
    assert.equal(seats[2]?.sideLabel, "B");
    assert.equal(seats[3]?.sideLabel, "B");
  });

  it("does not treat a 0-team tournament hub row as Full", () => {
    const seats = homeNextGameSeats([], 0, 24);
    const open = seats.length - seats.filter((seat) => seat.filled).length;
    assert.equal(seats.length, 24);
    assert.equal(open, 24);
    assert.equal(homeSpotsOpenLabel(open, seats.length), "24 spots open");
    assert.equal(homeSpotsOpenLabel(0, 0), null);
    assert.equal(
      homeSpotsOpenLabel(
        flattenSidesToHomeSeats([]).length,
        flattenSidesToHomeSeats([]).length,
      ),
      null,
    );
  });
});
