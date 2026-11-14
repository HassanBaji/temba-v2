import { describe, expect, it } from "vitest";

import {
  initialSquadSelection,
  squadButtonCopy,
  squadCounterLine,
  squadCounterParts,
  squadProgressSegments,
  squadRosterOrder,
  squadRosterPreview,
  squadRosterRowMeta,
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
      namedLine: "6 of 9 named",
      rosterLine: "from 12 on the roster",
      sideCounter: "side, 6",
      reserveCounter: "reserves, up to 3",
      stateLine: null,
      footer:
        "Named players are told and see the game in their Games tab. The rest of the roster sees it but isn't playing. You can change this until the score goes in.",
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
          ovr: 68,
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
      emptyLabel: "Open",
      player: {
        userId: "a",
        name: "Ali",
        initials: "A",
        code: "GK",
        meta: "GK · 68",
        unclaimed: false,
      },
      accessibilityLabel: "Side: Ali, Keeper",
    });
    expect(seats[1]?.player).toMatchObject({ meta: "FWD", code: "FWD" });
    expect(seats[2]).toMatchObject({
      key: "seat-2",
      player: null,
      emptyLabel: "Open",
      accessibilityLabel: "Side, not named yet",
    });
    expect(seats[7]).toMatchObject({
      kind: "reserve",
      label: "Reserve",
      emptyLabel: "Reserve",
      accessibilityLabel: "Reserve, not named yet",
    });
    expect(
      squadPlayerMeta(
        { userId: "c", name: "Sam", role: null, position: null },
        "en",
      ),
    ).toBe("");
  });

  it("splits the grid counter into its strong and muted halves", () => {
    expect(squadCounterParts(6, 6, "en")).toEqual({
      strong: "6 of 9 named",
      muted: "6 + 3 reserves",
    });
    expect(squadCounterParts(4, 6, "en")).toEqual({
      strong: "4 of 9",
      muted: "4 + 5 to name",
    });
    expect(squadCounterParts(0, 6, "en")).toEqual({
      strong: "0 of 9",
      muted: "Nobody named yet",
    });
    expect(squadCounterParts(4, 6, "ar").strong).toBe("4 من 9");
  });

  it("fills the sheet's bar up to the selection, the last three Reserves", () => {
    const segments = squadProgressSegments(7, 6);
    expect(segments).toHaveLength(9);
    expect(segments.filter((segment) => segment.filled)).toHaveLength(7);
    expect(segments[5]).toEqual({ kind: "side", filled: true });
    expect(segments[6]).toEqual({ kind: "reserve", filled: true });
    expect(segments[7]).toEqual({ kind: "reserve", filled: false });
  });

  it("orders the Roster Captain first, then the named, then the rest", () => {
    expect(
      squadRosterOrder(["a", "b", "c", "d", "e"], "c", ["e", "b"]),
    ).toEqual(["c", "e", "b", "a", "d"]);
    expect(squadRosterOrder(["a", "b"], "z", ["b", "z"])).toEqual(["b", "a"]);
  });

  it("previews one row per seat and counts the rest", () => {
    const rows = Array.from({ length: 12 }, (_, index) => index);
    expect(squadRosterPreview(rows, 6, 6, false)).toEqual({
      visible: rows.slice(0, 9),
      hiddenCount: 3,
    });
    expect(squadRosterPreview(rows, 6, 6, true).hiddenCount).toBe(0);
    expect(squadRosterPreview(rows.slice(0, 5), 6, 2, false).hiddenCount).toBe(
      0,
    );
  });

  it("writes each Roster row's line", () => {
    const base = {
      userId: "a",
      name: "Hassan Haji",
      role: "outfield" as const,
      position: "def" as const,
      ovr: null,
      isViewer: false,
      isCaptain: false,
    };
    expect(
      squadRosterRowMeta(
        { ...base, isViewer: true, isCaptain: true },
        true,
        "en",
      ),
    ).toBe("You, captain. DEF");
    expect(
      squadRosterRowMeta({ ...base, position: "mid", ovr: 72 }, true, "en"),
    ).toBe("MID, 72");
    expect(
      squadRosterRowMeta(
        { ...base, role: "keeper", position: null, unclaimed: true },
        true,
        "en",
      ),
    ).toBe("GK. Added by you, not on Temba");
    expect(
      squadRosterRowMeta(
        { ...base, role: null, position: null, unclaimed: true },
        false,
        "en",
      ),
    ).toBe("Added by the captain, not on Temba");
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
