import { describe, expect, it } from "vitest";

import {
  addGoal,
  confirmationLine,
  draftSummary,
  footballInviteJoinSubtitle,
  initialTeamsDraft,
  joinActionLabel,
  keeperNote,
  keeperSub,
  moveAcross,
  placeOn,
  poolLayout,
  removeGoal,
  scorersNote,
  scorersPayload,
  shortName,
  switchMethod,
  viewerSideLine,
  type BoardPlayer,
} from "./football-board";

function player(userId: string, extra: Partial<BoardPlayer> = {}): BoardPlayer {
  return {
    userId,
    name: `Player ${userId}`,
    image: null,
    role: "outfield",
    position: "mid",
    levelBand: null,
    sideIndex: null,
    goals: 0,
    isViewer: false,
    ...extra,
  };
}

describe("poolLayout", () => {
  it("seats everyone up to players allowed, with no bench", () => {
    const players = Array.from({ length: 12 }, (_, index) =>
      player(String(index)),
    );
    const layout = poolLayout(players, 5, 14);
    expect(layout.seats).toBe(14);
    expect(layout.pool).toHaveLength(12);
    expect(layout.openSeats).toBe(2);
  });

  it("falls back to both sides' seats without a cap", () => {
    expect(poolLayout([player("a")], 7, null).openSeats).toBe(13);
  });
});

describe("join sheet copy", () => {
  it("names the first keeper and counts keeper seats", () => {
    const players = [
      player("a"),
      player("b", { role: "keeper", name: "Hassan Ali" }),
    ];
    expect(keeperNote(players)).toBe(
      "One keeper per team, so 2 per game. Hassan A has the first.",
    );
    expect(keeperSub(players)).toBe("1 seat left");
    expect(keeperSub([...players, player("c", { role: "keeper" })])).toBe(
      "both taken",
    );
  });

  it("labels the join action by role and price", () => {
    expect(joinActionLabel("outfield", "mid", "1.500 BD")).toBe(
      "Join as MID, 1.500 BD",
    );
    expect(joinActionLabel("keeper", "mid", "Free")).toBe("Join as keeper");
  });

  it("sums up side size and open seats for an Invite link joiner", () => {
    expect(
      footballInviteJoinSubtitle({
        players: [player("a"), player("b")],
        sideSize: 5,
        playersAllowed: 10,
      }),
    ).toBe("5-a-side, 8 seats open");
  });

  it("shortens a name to first name and last initial", () => {
    expect(shortName("Faisal Ahmed Ali")).toBe("Faisal A");
    expect(shortName("Sofia")).toBe("Sofia");
  });
});

describe("teams draft", () => {
  const players = [
    player("k", { role: "keeper", levelBand: "C1" }),
    player("a", { levelBand: "A" }),
    player("b", { levelBand: "B2" }),
    player("c", { levelBand: "C2" }),
  ];

  it("starts from a split by Level, or from the published teams", () => {
    const fresh = initialTeamsDraft(players, null);
    expect(fresh.method).toBe("level");
    expect(fresh.bibs).toEqual({ slot1: "black", slot2: "white" });
    expect(Object.keys(fresh.sides)).toHaveLength(4);

    const published = initialTeamsDraft(
      players.map((row, index) => ({
        ...row,
        sideIndex: index % 2 === 0 ? 1 : 2,
      })),
      { method: "manual", bibs: { slot1: "red", slot2: "sky" } },
    );
    expect(published.sides).toEqual({ k: 1, a: 2, b: 1, c: 2 });
    expect(published.bibs).toEqual({ slot1: "red", slot2: "sky" });
  });

  it("moves players across and places them by swatch", () => {
    const draft = initialTeamsDraft(players, null);
    const moved = moveAcross(draft, "k");
    expect(moved.sides.k).not.toBe(draft.sides.k);
    const manual = switchMethod(draft, "manual", players);
    expect(manual.sides).toEqual({});
    const placed = placeOn(manual, "a", 1);
    expect(placed.sides).toEqual({ a: 1 });
    expect(placeOn(placed, "a", 1).sides).toEqual({});
  });

  it("summarises the split with keepers first and blocks unplaced players", () => {
    const manual = placeOn(
      placeOn(
        switchMethod(initialTeamsDraft(players, null), "manual", players),
        "a",
        1,
      ),
      "k",
      1,
    );
    const summary = draftSummary(manual, players);
    expect(summary.slot1.map((row) => row.userId)).toEqual(["k", "a"]);
    expect(summary.unplaced.map((row) => row.userId)).toEqual(["b", "c"]);
    expect(summary.problem).toBe("2 still to place.");

    const done = placeOn(placeOn(manual, "b", 2), "c", 2);
    expect(draftSummary(done, players).note).toBe(
      "Everyone placed. Black avg B, White avg B-.",
    );
  });
});

describe("score draft", () => {
  const players = [
    player("a", { sideIndex: 1 }),
    player("b", { sideIndex: 2 }),
  ];
  const names = { slot1: "Black", slot2: "White" };

  it("raises the side's Score when a goal is named past it", () => {
    let draft = { slot1: 1, slot2: 0, goals: {} };
    draft = addGoal(draft, players[0]!, players);
    expect(draft.slot1).toBe(1);
    draft = addGoal(draft, players[0]!, players);
    expect(draft.slot1).toBe(2);
    expect(draft.goals).toEqual({ a: 2 });
    expect(scorersNote(draft, players, names)).toBe(
      "2 of 2 Black goals and 0 of 0 White goals named.",
    );
    draft = removeGoal(removeGoal(draft, "a"), "a");
    expect(draft.goals).toEqual({});
    expect(scorersPayload({ ...draft, goals: { a: 1, b: 0 } })).toEqual([
      { userId: "a", goals: 1 },
    ]);
  });

  it("explains who still has to confirm", () => {
    expect(confirmationLine({ slot1: true, slot2: false }, names, false)).toBe(
      "Waiting for one player from White to confirm.",
    );
    expect(confirmationLine({ slot1: true, slot2: true }, names, true)).toBe(
      "Both sides confirmed.",
    );
    expect(confirmationLine({ slot1: true, slot2: false }, names, true)).toBe(
      "Confirmed by the Organizer.",
    );
  });

  it("names the Organizer for a side with no account holder", () => {
    const organizerSides = [{ slot: 2 as const }];
    expect(
      confirmationLine(
        { slot1: true, slot2: false },
        names,
        false,
        organizerSides,
      ),
    ).toBe("Waiting for the Organizer to confirm for White.");
    expect(
      confirmationLine(
        { slot1: false, slot2: false },
        names,
        false,
        organizerSides,
      ),
    ).toBe(
      "Waiting for one player from Black to confirm and the Organizer to confirm for White.",
    );
    expect(
      confirmationLine({ slot1: false, slot2: false }, names, false, [
        { slot: 1 },
        { slot: 2 },
      ]),
    ).toBe("Waiting for the Organizer to confirm for both sides.");
  });

  it("tells the viewer their team and position", () => {
    expect(
      viewerSideLine(
        { sideIndex: 2 },
        [player("me", { isViewer: true, position: "def" })],
        names,
      ),
    ).toBe("You play in White as DEF.");
  });
});
