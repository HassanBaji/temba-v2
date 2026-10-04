import assert from "node:assert/strict";
import { describe, it } from "vitest";

import {
  flattenSidesToHomeSeats,
  homeNextGameSeats,
  homeSeatCaption,
  homeSeatRowSummary,
  homeSeatsBySide,
  homeSpotsOpenLabel,
  type HomeSeatView,
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

describe("homeSeatCaption", () => {
  const filled: HomeSeatView = { id: "s", name: "Alex Rivera", filled: true };

  it("uses the first name, or initials on a crowded row", () => {
    assert.equal(homeSeatCaption(filled, false), "Alex");
    assert.equal(homeSeatCaption(filled, true), "AR");
  });

  it("has no caption for an open or unnamed seat", () => {
    assert.equal(
      homeSeatCaption({ id: "s", name: null, filled: false }, false),
      null,
    );
    assert.equal(
      homeSeatCaption({ id: "s", name: null, filled: true }, false),
      null,
    );
  });
});

describe("homeSeatsBySide", () => {
  it("groups seats by side label in first-seen order", () => {
    const seat = (id: string, sideLabel?: string): HomeSeatView => ({
      id,
      name: null,
      filled: false,
      sideLabel,
    });
    const groups = homeSeatsBySide([
      seat("a1", "A"),
      seat("b1", "B"),
      seat("a2", "A"),
    ]);
    assert.deepEqual(
      groups.map((group) => group.map((item) => item.id)),
      [["a1", "a2"], ["b1"]],
    );
  });
});

describe("homeSeatRowSummary", () => {
  it("counts filled seats and switches to initials above six", () => {
    const seats: HomeSeatView[] = Array.from({ length: 8 }, (_, index) => ({
      id: String(index),
      name: null,
      filled: index < 5,
    }));
    assert.deepEqual(homeSeatRowSummary(seats), {
      filled: 5,
      total: 8,
      useInitials: true,
      spotsLabel: "3 spots open",
    });
    assert.equal(homeSeatRowSummary(seats.slice(0, 4)).useInitials, false);
  });
});
