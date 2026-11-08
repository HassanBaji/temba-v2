import { describe, expect, it } from "vitest";

import {
  squadCounterLine,
  squadSeatCount,
  squadSeats,
  squadsReadyForScore,
  squadState,
} from "./matchday-squad";

describe("matchday squad", () => {
  it("seats the side plus three Reserves", () => {
    expect(squadSeatCount(5)).toBe(8);
    expect(squadSeatCount(6)).toBe(9);
    expect(squadSeatCount(7)).toBe(10);
  });

  it("reads empty, partial and named from the count, and locked over all", () => {
    expect(squadState(0, 6)).toBe("empty");
    expect(squadState(4, 6)).toBe("partial");
    expect(squadState(6, 6)).toBe("named");
    expect(squadState(9, 6)).toBe("named");
    expect(squadState(6, 6, { locked: true })).toBe("locked");
  });

  it("is ready for a Score only when both sides are named", () => {
    expect(squadsReadyForScore(["named", "named"])).toBe(true);
    expect(squadsReadyForScore(["named", "locked"])).toBe(true);
    expect(squadsReadyForScore(["named", "partial"])).toBe(false);
    expect(squadsReadyForScore(["empty", "empty"])).toBe(false);
    expect(squadsReadyForScore(["named"])).toBe(false);
  });

  it("labels the first side seats as the side and the last three Reserve, filled in naming order", () => {
    const seats = squadSeats(["Ali", "Omar"], 5, "en");
    expect(seats).toHaveLength(8);
    expect(seats.map((seat) => seat.label)).toEqual([
      "Side",
      "Side",
      "Side",
      "Side",
      "Side",
      "Reserve",
      "Reserve",
      "Reserve",
    ]);
    expect(seats.map((seat) => seat.player)).toEqual([
      "Ali",
      "Omar",
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
    expect(squadSeats([], 6, "ar")[8]?.label).toBe("احتياط");
  });

  it("writes the counter line for each state", () => {
    expect(squadCounterLine(6, 6, "en")).toBe("6 of 9 named, 6 + 3 reserves");
    expect(squadCounterLine(4, 6, "en")).toBe("4 + 5 to name, 4 of 9");
    expect(squadCounterLine(0, 6, "en")).toBe("Nobody named yet, 0 of 9");
    expect(squadCounterLine(4, 6, "ar")).toBe("4 + 5 للتسمية، 4 من 9");
  });
});
