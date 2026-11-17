import { describe, expect, it } from "vitest";

import {
  aloneDraftNote,
  aloneMakeTeamsRows,
  alonePlayerCard,
  alonePlayers,
  alonePostedTitle,
  aloneShareTeams,
  aloneSideShort,
  initialAloneDraft,
  type AloneSheetPlayer,
} from "./alone-teams-view";

function player(
  userId: string,
  level: number | null,
  preferredSide: "left" | "right" | null = null,
  levelBand: string | null = null,
): AloneSheetPlayer {
  return {
    userId,
    name: `${userId.toUpperCase()} Player`,
    image: null,
    level,
    levelBand,
    preferredSide,
  };
}

const eight = [
  player("a", 4, "left"),
  player("b", 3.5),
  player("c", 3),
  player("d", 2.5, "right"),
  player("e", 2),
  player("f", 3.25),
  player("g", 2.75),
  player("h", 1.5),
];

function byId(players: readonly AloneSheetPlayer[]) {
  return new Map(alonePlayers(players).map((entry) => [entry.id, entry]));
}

describe("initialAloneDraft", () => {
  it("opens on the balance by level before the teams are posted", () => {
    const draft = initialAloneDraft({
      players: eight,
      teams: [],
      teamsPostedAt: null,
    });
    expect(draft.mode).toBe("balanced");
    expect(draft.pairs).toHaveLength(4);
    expect(draft.unplaced).toBeNull();
  });

  it("opens on the posted teams, in side order, while they hold", () => {
    const draft = initialAloneDraft({
      players: [...eight, player("i", 3)],
      teams: [
        { sideIndex: 2, left: "c", right: "d" },
        { sideIndex: 1, left: "a", right: "b" },
        { sideIndex: 3, left: "e", right: "f" },
        { sideIndex: 4, left: "g", right: "h" },
      ],
      teamsPostedAt: new Date("2026-11-10T10:00:00Z"),
    });
    expect(draft.mode).toBe("posted");
    expect(draft.pairs[0]).toEqual({ left: "a", right: "b" });
    expect(draft.pairs[1]).toEqual({ left: "c", right: "d" });
    expect(draft.unplaced).toBe("i");
  });

  it("balances again when a posted team lost a player", () => {
    const draft = initialAloneDraft({
      players: eight,
      teams: [
        { sideIndex: 1, left: "a", right: null },
        { sideIndex: 2, left: "c", right: "d" },
      ],
      teamsPostedAt: new Date("2026-11-10T10:00:00Z"),
    });
    expect(draft.mode).toBe("balanced");
  });

  it("balances again when two or more players are not in a posted team", () => {
    const draft = initialAloneDraft({
      players: [...eight, player("i", 3), player("j", 3)],
      teams: [
        { sideIndex: 1, left: "a", right: "b" },
        { sideIndex: 2, left: "c", right: "d" },
        { sideIndex: 3, left: "e", right: "f" },
        { sideIndex: 4, left: "g", right: "h" },
      ],
      teamsPostedAt: new Date("2026-11-10T10:00:00Z"),
    });
    expect(draft.mode).toBe("balanced");
    expect(draft.pairs).toHaveLength(5);
  });
});

describe("aloneDraftNote", () => {
  const pairs = [
    { left: "a", right: "h" },
    { left: "b", right: "e" },
  ];

  it("gives the spread with two decimals, and the sides line when every pair has both", () => {
    expect(aloneDraftNote({ pairs, mode: "balanced" }, byId(eight), "en")).toBe(
      "Balanced by level: the teams are within 0.00 of each other. Every pair has a left and a right.",
    );
  });

  it("leaves the sides line out when a pair both asked for the same side", () => {
    const sameSide = [player("x", 3, "left"), player("y", 2, "left")];
    expect(
      aloneDraftNote(
        { pairs: [{ left: "x", right: "y" }], mode: "balanced" },
        byId(sameSide),
        "en",
      ),
    ).toBe("Balanced by level: the teams are within 0.00 of each other.");
  });

  it("says how the line-up was changed", () => {
    expect(aloneDraftNote({ pairs, mode: "shuffled" }, byId(eight), "en")).toBe(
      "Shuffled at random. Balance by level to go back.",
    );
    expect(aloneDraftNote({ pairs, mode: "edited" }, byId(eight), "en")).toBe(
      "Changed by hand. Balance by level to start again.",
    );
    expect(aloneDraftNote({ pairs, mode: "posted" }, byId(eight), "en")).toBe(
      "Every pair has a left and a right.",
    );
  });
});

describe("aloneMakeTeamsRows", () => {
  it("numbers the rows and shows band, side, average and the same-side mark", () => {
    const players = [
      player("a", 3.2, "left", "B−"),
      player("b", 3, "left", "C+"),
      player("c", null, null, null),
      player("d", 2.5, "right", "C"),
    ];
    const rows = aloneMakeTeamsRows(
      [
        { left: "a", right: "b" },
        { left: "c", right: "d" },
      ],
      players,
      "en",
    );
    expect(rows[0]).toEqual({
      number: "01",
      left: { userId: "a", name: "A Player", meta: "B− L" },
      right: { userId: "b", name: "B Player", meta: "C+ L" },
      average: "3.10",
      sameSide: "2 L",
    });
    expect(rows[1]?.left.meta).toBe("");
    expect(rows[1]?.average).toBe("2.50");
    expect(rows[1]?.sameSide).toBeNull();
  });
});

describe("aloneSideShort", () => {
  it("reads L, R or nothing for Either", () => {
    expect(aloneSideShort("left", "en")).toBe("L");
    expect(aloneSideShort("right", "en")).toBe("R");
    expect(aloneSideShort(null, "en")).toBeNull();
  });
});

describe("aloneShareTeams", () => {
  it("lists complete teams in side order with full names and the average", () => {
    expect(
      aloneShareTeams(eight, [
        { sideIndex: 2, left: "c", right: "d" },
        { sideIndex: 1, left: "a", right: "b" },
        { sideIndex: 3, left: "e", right: null },
      ]),
    ).toEqual([
      { leftName: "A Player", rightName: "B Player", average: 3.75 },
      { leftName: "C Player", rightName: "D Player", average: 2.75 },
    ]);
  });
});

describe("alonePostedTitle", () => {
  it("names the next draw by the Social's shape", () => {
    expect(alonePostedTitle({ knockoutOnly: false, king: false }, "en")).toBe(
      "Teams posted. Draw the group",
    );
    expect(alonePostedTitle({ knockoutOnly: true, king: false }, "en")).toBe(
      "Teams posted. Draw the bracket",
    );
    expect(alonePostedTitle({ knockoutOnly: false, king: true }, "en")).toBe(
      "Teams posted. Draw the starting courts",
    );
  });
});

describe("alonePlayerCard", () => {
  const viewer = { userId: "me", name: "Hassan Haji" };
  const partner = { userId: "p", name: "Khalid Janahi" };

  it("names the partner and both sides", () => {
    expect(
      alonePlayerCard({ left: partner, right: viewer }, "me", "en"),
    ).toEqual({
      title: "You’re with Khalid Janahi",
      body: "The organizer made the teams. You on the right, Khalid on the left. The draw comes next.",
      partnerName: "Khalid Janahi",
    });
  });

  it("tells an unplaced player they wait for a seat", () => {
    expect(alonePlayerCard(null, "me", "en").title).toBe(
      "Waiting for a partner",
    );
  });

  it("tells a player whose partner left that they wait", () => {
    const card = alonePlayerCard({ left: viewer, right: null }, "me", "en");
    expect(card.title).toBe("Waiting for a partner");
    expect(card.partnerName).toBeNull();
  });
});
