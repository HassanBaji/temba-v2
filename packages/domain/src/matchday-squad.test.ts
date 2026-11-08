import { describe, expect, it } from "vitest";

import {
  initialSquadSelection,
  squadButtonCopy,
  squadCounterLine,
  squadSelectionChanged,
  squadPlayerMeta,
  squadSeatViews,
  squadSelectionIsFull,
  squadSheetCopy,
  squadSeatCount,
  squadSeats,
  squadsReadyForScore,
  squadState,
  toggleSquadSelection,
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

  it("starts an unnamed side with the Captain, and a named side as named", () => {
    expect(initialSquadSelection([], "cap", ["cap", "a", "b"])).toEqual([
      "cap",
    ]);
    expect(initialSquadSelection([], "cap", ["a", "b"])).toEqual([]);
    expect(initialSquadSelection(["b", "a"], "cap", ["cap", "a", "b"])).toEqual(
      ["b", "a"],
    );
  });

  it("toggles a row on and off, appending in naming order up to side plus three", () => {
    const nine = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
    expect(toggleSquadSelection(["1"], "2", 6)).toEqual(["1", "2"]);
    expect(toggleSquadSelection(["1", "2", "3"], "2", 6)).toEqual(["1", "3"]);
    expect(toggleSquadSelection(nine, "10", 6)).toEqual(nine);
    expect(squadSelectionIsFull(nine, 6)).toBe(true);
    expect(squadSelectionIsFull(nine.slice(0, 8), 6)).toBe(false);
  });

  it("sees a change only when the names or their order differ", () => {
    expect(squadSelectionChanged(["a", "b"], ["a", "b"])).toBe(false);
    expect(squadSelectionChanged(["a", "b"], ["b", "a"])).toBe(true);
    expect(squadSelectionChanged(["a"], ["a", "b"])).toBe(true);
  });

  it("writes the sheet's title, help, counters and confirm label", () => {
    const friday = "2026-11-13T17:00:00.000Z";
    const sheet = squadSheetCopy(
      { sideSize: 6, selectedCount: 6, rosterCount: 12, kickoff: friday },
      "en",
    );
    expect(sheet).toEqual({
      title: "Your squad for Friday",
      help: "6-a-side, so 6 plus up to 3 reserves. Name at least 6 to confirm.",
      counter: "6 of 9 named from 12 on the roster",
      sideCounter: "side, 6",
      reserveCounter: "reserves, up to 3",
      stateLine: null,
      footer:
        "Everyone you add is told they are in the squad. Nobody is told when they come off it.",
      confirmLabel: "Confirm squad, 6 named",
    });
    expect(
      squadSheetCopy(
        { sideSize: 6, selectedCount: 4, rosterCount: 12, kickoff: friday },
        "en",
      ).stateLine,
    ).toBe("2 more to make the side. You can save and name the rest later.");
    expect(
      squadSheetCopy(
        { sideSize: 6, selectedCount: 9, rosterCount: 12, kickoff: null },
        "en",
      ),
    ).toMatchObject({
      title: "Your squad",
      stateLine: "The squad is full at 9. Remove someone to add another.",
      confirmLabel: "Confirm squad, 9 named",
    });
    expect(
      squadSheetCopy(
        { sideSize: 6, selectedCount: 6, rosterCount: 12, kickoff: friday },
        "ar",
      ).confirmLabel,
    ).toBe("أكّد التشكيلة، 6 مُسمّى");
  });

  it("draws named tiles with their role and hatched seats with their label", () => {
    const seats = squadSeatViews(
      [
        {
          userId: "a",
          name: "Ali",
          role: "keeper",
          position: null,
          levelBand: "C2",
        },
        { userId: "b", name: "Omar", role: "outfield", position: "fwd" },
      ],
      5,
      "en",
    );
    expect(seats).toHaveLength(8);
    expect(seats[0]).toEqual({
      key: "a",
      kind: "side",
      label: "Side",
      player: { userId: "a", name: "Ali", meta: "GK · C", unclaimed: false },
      accessibilityLabel: "Side: Ali, Keeper",
    });
    expect(seats[1]?.player?.meta).toBe("FWD");
    expect(seats[2]).toMatchObject({
      key: "seat-2",
      player: null,
      accessibilityLabel: "Side, not named yet",
    });
    expect(seats[7]).toMatchObject({
      kind: "reserve",
      label: "Reserve",
      accessibilityLabel: "Reserve, not named yet",
    });
    expect(
      squadPlayerMeta(
        { userId: "c", name: "Sam", role: null, position: null },
        "en",
      ),
    ).toBe("");
  });

  it("asks to name an empty side and to edit a named one", () => {
    expect(squadButtonCopy(0, "Hidd United", "en")).toEqual({
      label: "Name your squad",
      accessibilityLabel: "Name the squad for Hidd United",
    });
    expect(squadButtonCopy(4, "Hidd United", "en").label).toBe(
      "Edit your squad",
    );
  });
});
