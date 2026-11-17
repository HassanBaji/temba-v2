import { describe, expect, it } from "vitest";

import {
  alonePlayerMap,
  balancedDraft,
  firstName,
  makeTeamsNote,
  makeTeamsProblem,
  openSeatCount,
  openingMakeTeamsDraft,
  postedOrganizerTitle,
  postedPlayerCard,
  postedShareTeams,
  sameSlot,
  shuffledDraft,
  sideShort,
  slotUserId,
  swapMakeTeamsSlots,
  viewerPairing,
  type AloneTeamsSheet,
  type SheetPlayer,
} from "./alone-teams-model";

function player(
  userId: string,
  level: number | null,
  preferredSide: SheetPlayer["preferredSide"] = null,
): SheetPlayer {
  return {
    userId,
    name: `${userId.toUpperCase()} Player`,
    image: null,
    level,
    levelBand: null,
    preferredSide,
  };
}

const eight = [
  player("a", 4.5, "left"),
  player("b", 4.0, "right"),
  player("c", 3.5),
  player("d", 3.2, "left"),
  player("e", 3.0, "right"),
  player("f", 2.8),
  player("g", 2.5),
  player("h", 2.0),
];

const unposted: AloneTeamsSheet = {
  players: eight,
  teams: [],
  teamsPostedAt: null,
};

describe("openingMakeTeamsDraft", () => {
  it("opens balanced by level before the teams are posted", () => {
    const draft = openingMakeTeamsDraft(unposted);
    expect(draft.mode).toBe("balanced");
    expect(draft.pairs).toHaveLength(4);
    expect(draft.unplaced).toBeNull();
  });

  it("opens on the posted pairs while they still hold everyone", () => {
    const sheet: AloneTeamsSheet = {
      players: [...eight, player("i", 3)],
      teamsPostedAt: "2026-11-17T09:00:00.000Z",
      teams: [
        { gameTeamId: "t2", sideIndex: 2, left: "c", right: "d" },
        { gameTeamId: "t1", sideIndex: 1, left: "a", right: "b" },
        { gameTeamId: "t3", sideIndex: 3, left: "e", right: "f" },
        { gameTeamId: "t4", sideIndex: 4, left: "g", right: "h" },
      ],
    };
    const draft = openingMakeTeamsDraft(sheet);
    expect(draft.mode).toBe("posted");
    expect(draft.pairs[0]).toEqual({ left: "a", right: "b" });
    expect(draft.unplaced).toBe("i");
  });

  it("balances again when a posted team lost a player", () => {
    const draft = openingMakeTeamsDraft({
      players: eight,
      teamsPostedAt: "2026-11-17T09:00:00.000Z",
      teams: [
        { gameTeamId: "t1", sideIndex: 1, left: "a", right: null },
        { gameTeamId: "t2", sideIndex: 2, left: "c", right: "d" },
      ],
    });
    expect(draft.mode).toBe("balanced");
  });

  it("leaves the last odd player out", () => {
    const draft = balancedDraft([...eight, player("z", 5)]);
    expect(draft.unplaced).toBe("z");
  });
});

describe("swapMakeTeamsSlots", () => {
  const draft = balancedDraft(eight);

  it("trades two players and marks the line-up as edited", () => {
    const first = { pairIndex: 0, side: "left" } as const;
    const second = { pairIndex: 1, side: "right" } as const;
    const next = swapMakeTeamsSlots(draft, first, second);
    expect(next.mode).toBe("edited");
    expect(slotUserId(next, first)).toBe(slotUserId(draft, second));
    expect(slotUserId(next, second)).toBe(slotUserId(draft, first));
  });

  it("trades the odd player out into a pair", () => {
    const odd = balancedDraft([...eight, player("z", 5)]);
    const slot = { pairIndex: 2, side: "right" } as const;
    const next = swapMakeTeamsSlots(odd, "unplaced", slot);
    expect(slotUserId(next, slot)).toBe("z");
    expect(next.unplaced).toBe(slotUserId(odd, slot));
  });

  it("keeps the draft when the same seat is tapped twice", () => {
    const slot = { pairIndex: 0, side: "left" } as const;
    expect(swapMakeTeamsSlots(draft, slot, { ...slot })).toBe(draft);
    expect(sameSlot("unplaced", "unplaced")).toBe(true);
    expect(sameSlot("unplaced", slot)).toBe(false);
  });
});

describe("makeTeamsNote", () => {
  const byId = alonePlayerMap(eight);

  it("gives the spread to two decimals after a balance", () => {
    const note = makeTeamsNote(balancedDraft(eight), byId, "en");
    expect(note).toMatch(/^Balanced by level: the teams are within \d\.\d\d/);
  });

  it("says how a shuffled or edited line-up came about", () => {
    expect(
      makeTeamsNote(
        shuffledDraft(eight, () => 0.5),
        byId,
        "en",
      ),
    ).toBe("Shuffled at random. Balance by level to go back.");
    expect(
      makeTeamsNote({ ...balancedDraft(eight), mode: "edited" }, byId, "en"),
    ).toBe("Changed by hand. Balance by level to start again.");
  });
});

describe("makeTeamsProblem", () => {
  it("lets a full balanced line-up post", () => {
    expect(
      makeTeamsProblem(
        balancedDraft(eight),
        { players: eight, teamsAllowed: 8 },
        "en",
      ),
    ).toBeNull();
  });

  it("refuses more pairs than the Social holds, and too few", () => {
    const draft = balancedDraft(eight);
    expect(
      makeTeamsProblem(draft, { players: eight, teamsAllowed: 3 }, "en"),
    ).toBe("This Social has room for 3 teams.");
    const six = eight.slice(0, 6);
    expect(
      makeTeamsProblem(
        balancedDraft(six),
        { players: six, teamsAllowed: 8 },
        "en",
      ),
    ).toBe("Make at least 4 teams.");
  });
});

describe("posted Social copy", () => {
  it("names the draw the Organizer opens next", () => {
    expect(
      postedOrganizerTitle(
        { knockoutOnly: false, kingOfTheCourt: false },
        "en",
      ),
    ).toBe("Teams posted. Draw the group");
    expect(
      postedOrganizerTitle({ knockoutOnly: true, kingOfTheCourt: false }, "en"),
    ).toBe("Teams posted. Draw the bracket");
    expect(
      postedOrganizerTitle({ knockoutOnly: false, kingOfTheCourt: true }, "en"),
    ).toBe("Teams posted. Draw the starting courts");
  });

  it("tells a player who they are with and on which side", () => {
    const side = {
      sideIndex: 7,
      left: {
        userId: "k",
        name: "Khalid Janahi",
        image: null,
        levelBand: null,
      },
      right: {
        userId: "me",
        name: "Hassan Haji",
        image: null,
        levelBand: null,
      },
    };
    const pairing = viewerPairing(side as never, "me");
    expect(pairing?.side).toBe("right");
    const card = postedPlayerCard(pairing, "en");
    expect(card.title).toBe("You’re with Khalid Janahi");
    expect(card.body).toContain("You on the right, Khalid on the left");
    expect(card.waiting).toBe(false);
  });

  it("tells a player without a partner that they wait", () => {
    expect(postedPlayerCard(null, "en").waiting).toBe(true);
  });
});

describe("postedShareTeams", () => {
  it("lists full teams in side order with the pair average", () => {
    const teams = postedShareTeams({
      players: eight,
      teamsPostedAt: "2026-11-17T09:00:00.000Z",
      teams: [
        { gameTeamId: "t2", sideIndex: 2, left: "c", right: "d" },
        { gameTeamId: "t1", sideIndex: 1, left: "a", right: "b" },
        { gameTeamId: "t3", sideIndex: 3, left: "e", right: null },
      ],
    });
    expect(teams.map((team) => team.gameTeamId)).toEqual(["t1", "t2"]);
    expect(teams[0]?.average).toBeCloseTo(4.25);
  });
});

describe("small helpers", () => {
  it("reads first names, side letters and open seats", () => {
    expect(firstName("  Khalid  Janahi ")).toBe("Khalid");
    expect(sideShort("left", "en")).toBe("L");
    expect(sideShort(null, "en")).toBeNull();
    expect(openSeatCount(11, 16)).toBe(5);
    expect(openSeatCount(18, 16)).toBe(0);
  });
});
