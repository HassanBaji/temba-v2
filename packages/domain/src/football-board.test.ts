import { describe, expect, it } from "vitest";

import {
  addGoal,
  balancedSides,
  boardTierCell,
  confirmationLine,
  draftSummary,
  footballHeroLines,
  footballInviteJoinSubtitle,
  initialTeamsDraft,
  joinActionLabel,
  keeperNote,
  keeperSub,
  moveAcross,
  placeOn,
  poolLayout,
  poolSections,
  removeGoal,
  scorersNote,
  scorersPayload,
  shortName,
  switchMethod,
  teamsSideAverage,
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

describe("poolSections", () => {
  it("splits keepers from outfield and hatches a seat for each missing keeper", () => {
    const pool = [player("a", { role: "keeper" }), player("b"), player("c")];
    const sections = poolSections(pool, 10, "en");
    expect(sections.keepers.map((row) => row.userId)).toEqual(["a"]);
    expect(sections.outfield.map((row) => row.userId)).toEqual(["b", "c"]);
    expect(sections.keeperOpenSeats).toBe(1);
    expect(sections.outfieldOpenSeats).toBe(6);
    expect(sections.keepersLine).toBe("1 keeper, one more needed");
    expect(sections.outfieldLine).toBe("2 of 8 in");
  });

  it("shows no keeper cells once both keepers are in", () => {
    const pool = [
      player("a", { role: "keeper" }),
      player("b", { role: "keeper" }),
    ];
    const sections = poolSections(pool, 10, "en");
    expect(sections.keeperOpenSeats).toBe(0);
    expect(sections.outfieldOpenSeats).toBe(8);
    expect(sections.outfieldLine).toBe("0 of 8 in");
  });

  it("never hatches more cells than seats are open", () => {
    const pool = Array.from({ length: 10 }, (_, index) =>
      player(String(index)),
    );
    const sections = poolSections(pool, 10, "en");
    expect(sections.keeperOpenSeats).toBe(0);
    expect(sections.outfieldOpenSeats).toBe(0);
    expect(sections.outfieldLine).toBe("10 of 10 in");
  });
});

describe("join sheet copy", () => {
  it("names the first keeper and counts keeper seats", () => {
    const players = [
      player("a"),
      player("b", { role: "keeper", name: "Hassan Ali" }),
    ];
    expect(keeperNote(players, "en")).toBe(
      "One keeper per team, so 2 per game. Hassan A has the first.",
    );
    expect(keeperSub(players, "en")).toBe("1 seat left");
    expect(keeperSub([...players, player("c", { role: "keeper" })], "en")).toBe(
      "both taken",
    );
  });

  it("labels the join action by role and price", () => {
    expect(joinActionLabel("outfield", "mid", "1.500 BD", "en")).toBe(
      "Join as MID, 1.500 BD",
    );
    expect(joinActionLabel("keeper", "mid", "Free", "en")).toBe(
      "Join as keeper",
    );
  });

  it("sums up side size and open seats for an Invite link joiner", () => {
    expect(
      footballInviteJoinSubtitle(
        {
          players: [player("a"), player("b")],
          sideSize: 5,
          playersAllowed: 10,
        },
        "en",
      ),
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
    const summary = draftSummary(manual, players, "en");
    expect(summary.slot1.map((row) => row.userId)).toEqual(["k", "a"]);
    expect(summary.unplaced.map((row) => row.userId)).toEqual(["b", "c"]);
    expect(summary.problem).toBe("2 still to place.");

    const done = placeOn(placeOn(manual, "b", 2), "c", 2);
    expect(draftSummary(done, players, "en").note).toBe(
      "Everyone placed. Black avg B, White avg B-.",
    );
  });
});

describe("teams draft in a tier Group", () => {
  const tierPlayers = [
    player("k1", { role: "keeper", levelBand: "A", balanceStrength: 1180 }),
    player("k2", { role: "keeper", levelBand: "D3", balanceStrength: 1214 }),
    player("a", { levelBand: "D3", balanceStrength: 1412 }),
    player("b", { levelBand: "D3", balanceStrength: 1356 }),
    player("c", { levelBand: "A", balanceStrength: 1301 }),
    player("d", { levelBand: "A", balanceStrength: 1248 }),
  ];

  it("splits on balance strength, not on the Level band", () => {
    expect(balancedSides(tierPlayers)).toEqual({
      k1: 1,
      k2: 2,
      a: 2,
      b: 1,
      c: 1,
      d: 2,
    });
  });

  it("lists each side strongest down and reads its mean in points", () => {
    const draft = initialTeamsDraft(tierPlayers, null);
    const summary = draftSummary(draft, tierPlayers, "en");
    expect(summary.slot1.map((row) => row.userId)).toEqual(["k1", "b", "c"]);
    expect(summary.slot2.map((row) => row.userId)).toEqual(["k2", "a", "d"]);
    expect(teamsSideAverage(summary.slot1, "en")).toBe("1,279 points");
    expect(summary.note).toBe(
      "Everyone placed. Black avg 1,279 points, White avg 1,291 points.",
    );
  });

  it("reads the Level when any player has no strength", () => {
    expect(
      teamsSideAverage(
        [
          player("a", { levelBand: "B1", balanceStrength: 1300 }),
          player("b", { levelBand: "B1" }),
        ],
        "en",
      ),
    ).toBe("B+");
  });

  it("puts the fish, the place or a Provisional slot beside a player", () => {
    const tier = {
      band: "hamour" as const,
      place: 2,
      points: 1356,
      provisional: false,
      gamesOfFive: 5,
    };
    expect(boardTierCell(player("a", { tier }), "en")).toEqual({
      kind: "fish",
      band: "hamour",
      label: "Hamour",
    });
    expect(
      boardTierCell(player("a", { tier: { ...tier, band: null } }), "en"),
    ).toEqual({ kind: "place", label: "#2" });
    expect(
      boardTierCell(
        player("a", {
          tier: { ...tier, band: null, place: null, provisional: true },
        }),
        "en",
      ),
    ).toEqual({ kind: "provisional", label: "Provisional" });
    expect(boardTierCell(player("a"), "en")).toBeNull();
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
    expect(scorersNote(draft, players, names, "en")).toBe(
      "2 of 2 Black goals and 0 of 0 White goals named.",
    );
    draft = removeGoal(removeGoal(draft, "a"), "a");
    expect(draft.goals).toEqual({});
    expect(scorersPayload({ ...draft, goals: { a: 1, b: 0 } })).toEqual([
      { userId: "a", goals: 1 },
    ]);
  });

  it("explains who still has to confirm", () => {
    expect(
      confirmationLine({ slot1: true, slot2: false }, names, false, "en"),
    ).toBe("Waiting for one player from White to confirm.");
    expect(
      confirmationLine({ slot1: true, slot2: true }, names, true, "en"),
    ).toBe("Both sides confirmed.");
    expect(
      confirmationLine({ slot1: true, slot2: false }, names, true, "en"),
    ).toBe("Confirmed by the Organizer.");
  });

  it("names the Organizer for a side with no account holder", () => {
    const organizerSides = [{ slot: 2 as const }];
    expect(
      confirmationLine(
        { slot1: true, slot2: false },
        names,
        false,
        "en",
        organizerSides,
      ),
    ).toBe("Waiting for the Organizer to confirm for White.");
    expect(
      confirmationLine(
        { slot1: false, slot2: false },
        names,
        false,
        "en",
        organizerSides,
      ),
    ).toBe(
      "Waiting for one player from Black to confirm and the Organizer to confirm for White.",
    );
    expect(
      confirmationLine({ slot1: false, slot2: false }, names, false, "en", [
        { slot: 1 },
        { slot: 2 },
      ]),
    ).toBe("Waiting for the Organizer to confirm for both sides.");
  });

  it("reads the confirmation and viewer lines in Arabic", () => {
    const arabicNames = { slot1: "أسود", slot2: "أبيض" };
    expect(
      confirmationLine({ slot1: true, slot2: false }, arabicNames, false, "ar"),
    ).toBe("بانتظار تأكيد لاعب واحد من أبيض.");
    expect(
      viewerSideLine(
        { sideIndex: 2 },
        [player("me", { isViewer: true, position: "def" })],
        arabicNames,
        "ar",
      ),
    ).toBe("تلعب في أبيض بمركز دفاع.");
    expect(keeperSub([player("a")], "ar")).toBe("تبقّى مكانان");
  });

  it("tells the viewer their team and position", () => {
    expect(
      viewerSideLine(
        { sideIndex: 2 },
        [player("me", { isViewer: true, position: "def" })],
        names,
        "en",
      ),
    ).toBe("You play in White as DEF.");
  });
});

describe("footballHeroLines", () => {
  const start = new Date("2026-11-04T07:30:00.000Z");
  const input = {
    windowStart: start,
    windowEnd: new Date("2026-11-04T09:00:00.000Z"),
    cancelledAt: null,
    sideSize: 5,
    venueName: null,
    pitchName: null,
    teamsSet: false,
    scored: false,
  };
  const at = (minutes: number) =>
    new Date(start.getTime() + minutes * 60 * 1000);

  it("reads live once kick-off has passed, not upcoming", () => {
    expect(footballHeroLines(input, at(-15), "ar").status).toMatch(/^قادمة/);
    expect(footballHeroLines(input, at(42), "ar").status).toBe("جارية الآن");
  });

  it("asks for the score once the window ends without one", () => {
    expect(footballHeroLines(input, at(120), "ar").status).toBe(
      "انتهت، أدخل النتيجة",
    );
    expect(
      footballHeroLines({ ...input, scored: true }, at(120), "ar").status,
    ).toBe("لُعبت");
  });
});
