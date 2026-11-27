import { describe, expect, it } from "vitest";

import {
  balancedSides,
  boardTierCell,
  captainsOnTheirSides,
  clearSides,
  confirmationLine,
  draftSummary,
  footballHeroLines,
  footballInviteJoinSubtitle,
  initialTeamsDraft,
  joinActionLabel,
  keeperNote,
  keeperSub,
  mayBeSideCaptain,
  moveAcross,
  NO_SIDE_CAPTAINS,
  otherSide,
  teamsRating,
  teamsTileName,
  tierProvisionalCount,
  ovrLabel,
  ovrSpoken,
  placeOn,
  poolTileName,
  poolTileTier,
  poolLayout,
  poolSections,
  lineupName,
  lineupPlayerName,
  ofSide,
  setPickCaptain,
  setSideCaptain,
  shortName,
  shuffleSides,
  sidesFromSplit,
  switchMethod,
  tileShortName,
  sideOvrAverage,
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
    player("k", { role: "keeper", levelBand: "C1", ovr: 70 }),
    player("a", { levelBand: "A", ovr: 92 }),
    player("b", { levelBand: "B2", ovr: 80 }),
    player("c", { levelBand: "C2", ovr: 66 }),
  ];

  it("starts from a split by Level, or from the published teams", () => {
    const fresh = initialTeamsDraft(players, null, null);
    expect(fresh.method).toBe("level");
    expect(fresh.bibs).toEqual({ slot1: "black", slot2: "white" });
    expect(Object.keys(fresh.sides)).toHaveLength(4);

    const published = initialTeamsDraft(
      players.map((row, index) => ({
        ...row,
        sideIndex: index % 2 === 0 ? 1 : 2,
      })),
      {
        method: "manual",
        bibs: { slot1: "red", slot2: "sky" },
        captains: NO_SIDE_CAPTAINS,
      },
      null,
    );
    expect(published.sides).toEqual({ k: 1, a: 2, b: 1, c: 2 });
    expect(published.bibs).toEqual({ slot1: "red", slot2: "sky" });
  });

  it("starts from the saved Draft line-up before the published teams", () => {
    const saved = initialTeamsDraft(
      players.map((row) => ({ ...row, sideIndex: 1 as const })),
      {
        method: "level",
        bibs: { slot1: "black", slot2: "white" },
        captains: NO_SIDE_CAPTAINS,
      },
      {
        method: "manual",
        bibs: { slot1: "green", slot2: "pink" },
        sides: { slot1: ["k", "gone"], slot2: ["a"] },
        captains: NO_SIDE_CAPTAINS,
      },
    );
    expect(saved).toEqual({
      method: "manual",
      bibs: { slot1: "green", slot2: "pink" },
      sides: { k: 1, a: 2 },
      captains: { slot1: null, slot2: null },
    });
  });

  it("moves players across and places them by swatch", () => {
    const draft = initialTeamsDraft(players, null, null);
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
        switchMethod(initialTeamsDraft(players, null, null), "manual", players),
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
      "Everyone placed. Black avg OVR 81, White avg OVR 73.",
    );
  });
});

describe("Side captains on the teams draft (ADR-0108)", () => {
  const players = [
    player("k", { role: "keeper", levelBand: "C1", ovr: 70 }),
    player("a", { levelBand: "A", ovr: 92 }),
    player("b", { levelBand: "B2", ovr: 80 }),
    player("c", { levelBand: "C2", ovr: 66 }),
  ];
  const split = {
    method: "manual" as const,
    bibs: { slot1: "black", slot2: "white" } as const,
    sides: { slot1: ["k", "a"], slot2: ["b", "c"] },
    captains: NO_SIDE_CAPTAINS,
  };

  function named() {
    return setSideCaptain(
      setSideCaptain(initialTeamsDraft(players, null, split), 1, "a"),
      2,
      "b",
    );
  }

  it("names one captain per side, from that side's players only, or none", () => {
    const draft = named();
    expect(draft.captains).toEqual({ slot1: "a", slot2: "b" });
    expect(setSideCaptain(draft, 1, "c")).toBe(draft);
    expect(setSideCaptain(draft, 1, "k").captains).toEqual({
      slot1: "k",
      slot2: "b",
    });
    expect(setSideCaptain(draft, 2, null).captains).toEqual({
      slot1: "a",
      slot2: null,
    });
  });

  it("clears a captain moved to the other team, and keeps the other side's", () => {
    expect(moveAcross(named(), "a").captains).toEqual({
      slot1: null,
      slot2: "b",
    });
    expect(moveAcross(named(), "k").captains).toEqual({
      slot1: "a",
      slot2: "b",
    });
  });

  it("clears a captain unplaced or placed on the other side", () => {
    expect(placeOn(named(), "a", 1).captains).toEqual({
      slot1: null,
      slot2: "b",
    });
    expect(placeOn(named(), "b", 1).captains).toEqual({
      slot1: "a",
      slot2: null,
    });
  });

  it("clears both on Shuffle, Clear and a method switch", () => {
    const none = { slot1: null, slot2: null };
    expect(shuffleSides(named(), players, () => 0.5).captains).toEqual(none);
    expect(clearSides(named())).toMatchObject({ sides: {}, captains: none });
    expect(switchMethod(named(), "level", players).captains).toEqual(none);
  });

  it("starts from the saved draft's captains, or the published teams', while they are on their side", () => {
    expect(
      initialTeamsDraft(players, null, {
        ...split,
        captains: { slot1: "a", slot2: "k" },
      }).captains,
    ).toEqual({ slot1: "a", slot2: null });
    expect(
      initialTeamsDraft(
        players.map((row) => ({
          ...row,
          sideIndex: row.userId === "k" || row.userId === "a" ? 1 : 2,
        })),
        {
          method: "level",
          bibs: split.bibs,
          captains: { slot1: "k", slot2: "c" },
        },
        null,
      ).captains,
    ).toEqual({ slot1: "k", slot2: "c" });
    expect(initialTeamsDraft(players, null, null).captains).toEqual({
      slot1: null,
      slot2: null,
    });
  });

  it("offers only players with an account", () => {
    expect(mayBeSideCaptain(player("a"))).toBe(true);
    expect(mayBeSideCaptain(player("g", { guest: true }))).toBe(false);
    expect(mayBeSideCaptain(player("u", { unclaimed: true }))).toBe(false);
  });
});

describe("teams draft in a tier Group", () => {
  const ranked = {
    band: "hamour" as const,
    place: 1,
    points: 1200,
    provisional: false,
    gamesOfFive: 5,
  };
  const tierPlayers = [
    player("k1", {
      role: "keeper",
      levelBand: "A",
      balanceStrength: 1180,
      tier: ranked,
    }),
    player("k2", {
      role: "keeper",
      levelBand: "D3",
      balanceStrength: 1214,
      tier: ranked,
    }),
    player("a", { levelBand: "D3", balanceStrength: 1412, tier: ranked }),
    player("b", { levelBand: "D3", balanceStrength: 1356, tier: ranked }),
    player("c", { levelBand: "A", balanceStrength: 1301, tier: ranked }),
    player("d", { levelBand: "A", balanceStrength: 1248, tier: ranked }),
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
    const draft = initialTeamsDraft(tierPlayers, null, null);
    const summary = draftSummary(draft, tierPlayers, "en");
    expect(summary.slot1.map((row) => row.userId)).toEqual(["k1", "b", "c"]);
    expect(summary.slot2.map((row) => row.userId)).toEqual(["k2", "a", "d"]);
    expect(teamsSideAverage(summary.slot1, "en")).toBe("1,279 points");
    expect(summary.note).toBe(
      "Everyone placed. Black avg 1,279 points, White avg 1,291 points.",
    );
  });

  it("reads the mean OVR, never a band, when any player has no strength", () => {
    expect(
      teamsSideAverage(
        [
          player("a", { levelBand: "B1", ovr: 72, balanceStrength: 1300 }),
          player("b", { levelBand: "B1", ovr: 77 }),
          player("c", { levelBand: "B1" }),
        ],
        "en",
      ),
    ).toBe("OVR 75");
    expect(teamsSideAverage([player("a", { levelBand: "B1" })], "en")).toBe(
      "–",
    );
  });

  it("shows each row's OVR, not its band, and a dash without one", () => {
    expect(ovrLabel(player("a", { levelBand: "D3", ovr: 61 }))).toBe("61");
    expect(ovrLabel(tierPlayers[0]!)).toBe("–");
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

describe("pool tiles", () => {
  it("shortens a name to the first name and last initial, or the first name alone past ten characters", () => {
    expect(tileShortName("Abdulla Saleh", "en")).toBe("Abdulla S.");
    expect(tileShortName("Abdulrahman Al-Mahmood", "en")).toBe("Abdulrahman");
    expect(tileShortName("Mohammed Jaber", "en")).toBe("Mohammed");
    expect(tileShortName("Faisal", "en")).toBe("Faisal");
    expect(tileShortName("  omar   bin   talal ", "en")).toBe("omar T.");
  });

  it("names the viewer You and keeps a Member nickname whole", () => {
    expect(
      poolTileName(player("a", { name: "Hassan Habib", isViewer: true }), "en")
        .name,
    ).toBe("You");
    expect(
      poolTileName(
        player("a", {
          name: "Ali Mansoor",
          nickname: { name: "Captain Ali the Great", visibility: "group" },
        }),
        "en",
      ),
    ).toMatchObject({ name: "Captain Ali the Great", isNickname: true });
    expect(poolTileName(player("a", { name: "Ali Mansoor" }), "en").name).toBe(
      "Ali M.",
    );
  });

  const tier = {
    band: "hamour" as const,
    place: 2,
    points: 1356,
    provisional: false,
    gamesOfFive: 5,
  };

  it("shows the fish and its band, the place, or Provisional in a tier Group", () => {
    expect(poolTileTier(player("a", { tier }), "en")).toEqual({
      mark: { kind: "fish", band: "hamour" },
      label: "Hamour",
      spoken: "Hamour",
    });
    expect(
      poolTileTier(player("a", { tier: { ...tier, band: null } }), "en"),
    ).toEqual({ mark: null, label: "#2", spoken: "#2" });
    expect(
      poolTileTier(
        player("a", {
          tier: { ...tier, band: null, place: null, provisional: true },
          ovr: 70,
        }),
        "en",
      ),
    ).toEqual({
      mark: { kind: "hatch" },
      label: "Provisional",
      spoken: "Provisional",
    });
  });

  it("shows the OVR outside a tier Group, hatched while Provisional", () => {
    expect(poolTileTier(player("a", { ovr: 69 }), "en")).toEqual({
      mark: null,
      label: "OVR 69",
      spoken: "OVR 69",
    });
    expect(
      poolTileTier(player("a", { ovr: 58, ovrProvisional: true }), "en"),
    ).toEqual({
      mark: { kind: "hatch" },
      label: "OVR 58",
      spoken: "OVR 58, Provisional",
    });
    expect(poolTileTier(player("a"), "en")).toEqual({
      mark: null,
      label: "–",
      spoken: null,
    });
  });

  it("shows Guest for a guest, who has no tier", () => {
    expect(
      poolTileTier(player("a", { guest: true, ovr: 64, tier }), "en"),
    ).toEqual({ mark: null, label: "Guest", spoken: "Guest" });
  });
});

describe("teams draft outside a tier Group", () => {
  const ovrPlayers = [
    player("k1", {
      role: "keeper",
      levelBand: "C1",
      ovr: 72,
      balanceStrength: 72,
    }),
    player("k2", {
      role: "keeper",
      levelBand: "C2",
      ovr: 68,
      balanceStrength: 68,
    }),
    player("a", { levelBand: "D3", ovr: 84, balanceStrength: 84 }),
    player("b", { levelBand: "A", ovr: 78, balanceStrength: 78 }),
    player("c", { levelBand: "C1", ovr: 70, balanceStrength: 70 }),
    player("d", { levelBand: null, ovr: null, balanceStrength: 65 }),
  ];

  it("splits on OVR and reads each side's mean OVR", () => {
    const draft = initialTeamsDraft(ovrPlayers, null, null);
    expect(draft.sides).toEqual({ k1: 1, k2: 2, a: 2, b: 1, c: 1, d: 2 });
    const summary = draftSummary(draft, ovrPlayers, "en", "ovr");
    expect(summary.slot2.map((row) => row.userId)).toEqual(["k2", "a", "d"]);
    expect(teamsSideAverage(summary.slot1, "en", "ovr")).toBe("OVR 73");
    expect(summary.note).toBe(
      "Everyone placed. Black avg OVR 73, White avg OVR 72.",
    );
  });

  it("reads a published side's mean OVR over the players who have one", () => {
    expect(sideOvrAverage(ovrPlayers.slice(2), "en")).toBe("OVR 77");
    expect(sideOvrAverage([{ ovr: null }], "en")).toBe("–");
  });

  it("shows the OVR where the Level sits, a dash without one", () => {
    expect(ovrLabel(ovrPlayers[2]!)).toBe("84");
    expect(ovrLabel(ovrPlayers[5]!)).toBe("–");
    expect(ovrSpoken(ovrPlayers[2]!, "en")).toBe("OVR 84");
    expect(ovrSpoken(ovrPlayers[5]!, "en")).toBeNull();
  });
});

describe("score confirmation", () => {
  const players = [
    player("a", { sideIndex: 1 }),
    player("b", { sideIndex: 2 }),
  ];
  const names = { slot1: "Black", slot2: "White" };

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

  it("reads the draft to the Organizer who has one, until kick-off", () => {
    const draft = { ...input, draftSaved: true };
    expect(footballHeroLines(draft, at(-15), "en").status).toBe(
      "Draft, not published",
    );
    expect(footballHeroLines(draft, at(-15), "ar").status).toBe(
      "مسودة، لم تُنشر",
    );
    expect(footballHeroLines(draft, at(42), "en").status).toBe("Live now");
  });

  it("names the team a Side captain captains on the draft", () => {
    const draft = { ...input, draftSaved: true, draftSideCaptainOf: "Black" };
    expect(footballHeroLines(draft, at(-15), "en").status).toBe(
      "Draft, you captain Black",
    );
    expect(footballHeroLines(draft, at(-15), "ar").status).toBe(
      "مسودة، أنت قائد Black",
    );
  });
});

describe("lineupName", () => {
  const ahmed = { name: "Ahmed Nasser", isViewer: false };

  it("reads the short Temba name without a Member nickname", () => {
    expect(lineupName(ahmed, "en")).toEqual({
      name: "Ahmed N",
      spoken: "Ahmed N",
      isNickname: false,
    });
  });

  it("reads the Member nickname in full and says whose it is", () => {
    expect(
      lineupName(
        { ...ahmed, nickname: { name: "Ahmed keeper", visibility: "group" } },
        "en",
      ),
    ).toEqual({
      name: "Ahmed keeper",
      spoken: "Ahmed keeper, this Group's name for Ahmed Nasser",
      isNickname: true,
    });
  });

  it("calls the viewer You, nickname or not", () => {
    expect(
      lineupName(
        {
          ...ahmed,
          isViewer: true,
          nickname: { name: "Ahmed keeper", visibility: "group" },
        },
        "en",
      ).name,
    ).toBe("You");
  });
});

describe("lineupPlayerName", () => {
  it("reads You for the viewer, a nickname, or the short name", () => {
    expect(
      lineupPlayerName({ name: "Rashid Nasser", isViewer: true }, "en"),
    ).toBe("You");
    expect(
      lineupPlayerName(
        {
          name: "Rashid Nasser",
          isViewer: false,
          nickname: { name: "Rash", visibility: "group" },
        },
        "en",
      ),
    ).toBe("Rash");
    expect(
      lineupPlayerName({ name: "Rashid Nasser", isViewer: false }, "en"),
    ).toBe("Rashid N");
  });

  it("is null without a player", () => {
    expect(lineupPlayerName(undefined, "en")).toBeNull();
    expect(lineupPlayerName(null, "en")).toBeNull();
  });
});

describe("ofSide", () => {
  it("reads a pair by side", () => {
    const names = { slot1: "Black", slot2: "White" };
    expect(ofSide(names, 1)).toBe("Black");
    expect(ofSide(names, 2)).toBe("White");
  });
});

describe("captainsOnTheirSides", () => {
  it("keeps a Side captain only while they are on that side", () => {
    const sides = sidesFromSplit({ slot1: ["a", "b"], slot2: ["c"] });
    expect(sides).toEqual({ a: 1, b: 1, c: 2 });
    expect(captainsOnTheirSides({ slot1: "a", slot2: "c" }, sides)).toEqual({
      slot1: "a",
      slot2: "c",
    });
    expect(captainsOnTheirSides({ slot1: "c", slot2: "gone" }, sides)).toEqual({
      slot1: null,
      slot2: null,
    });
    expect(captainsOnTheirSides(NO_SIDE_CAPTAINS, sides)).toEqual(
      NO_SIDE_CAPTAINS,
    );
  });
});

describe("setPickCaptain", () => {
  const roster = ["a", "b", "c", "d"].map((id) => player(id));
  const setup = switchMethod(
    initialTeamsDraft(roster, null, null),
    "captain_pick",
    roster,
  );

  it("opens teams a Captain pick made by hand", () => {
    const picked = initialTeamsDraft(roster, null, {
      method: "captain_pick",
      bibs: { slot1: "black", slot2: "white" },
      sides: { slot1: ["a", "b"], slot2: ["c", "d"] },
      captains: { slot1: "a", slot2: "c" },
    });
    expect(picked.method).toBe("manual");
    expect(picked.sides).toEqual({ a: 1, b: 1, c: 2, d: 2 });
    expect(picked.captains).toEqual({ slot1: "a", slot2: "c" });
  });

  it("starts a Captain pick with nobody placed and no captains", () => {
    expect(setup.method).toBe("captain_pick");
    expect(setup.sides).toEqual({});
    expect(setup.captains).toEqual({ slot1: null, slot2: null });
  });

  it("seats each captain on their side and leaves everyone else to be picked", () => {
    const named = setPickCaptain(setPickCaptain(setup, 1, "a"), 2, "c");
    expect(named.captains).toEqual({ slot1: "a", slot2: "c" });
    expect(named.sides).toEqual({ a: 1, c: 2 });
  });

  it("moves the other side's captain across, and replaces or clears one", () => {
    const named = setPickCaptain(setPickCaptain(setup, 1, "a"), 2, "c");
    expect(setPickCaptain(named, 1, "c").captains).toEqual({
      slot1: "c",
      slot2: null,
    });
    expect(setPickCaptain(named, 2, "d").sides).toEqual({ a: 1, d: 2 });
    expect(setPickCaptain(named, 1, null).sides).toEqual({ c: 2 });
  });
});

const rankedTier = {
  band: "hamour" as const,
  place: 3,
  points: 1310,
  provisional: false,
  gamesOfFive: 5,
};

describe("teamsRating", () => {
  it("shows the Tier points the averages are taken over", () => {
    expect(
      teamsRating(
        player("a", { tier: rankedTier, balanceStrength: 1310 }),
        "tierPoints",
        "en",
      ),
    ).toEqual({ kind: "rated", value: "1,310", spoken: "1,310 points" });
  });

  it("shows the OVR off a tier Group, a dash without one", () => {
    expect(
      teamsRating(player("a", { ovr: 72, balanceStrength: 72.4 }), "ovr", "en"),
    ).toMatchObject({ kind: "rated", value: "72", spoken: "OVR 72" });
    expect(teamsRating(player("b"), "ovr", "en")).toMatchObject({
      kind: "rated",
      value: "–",
    });
  });

  it("reads new while the Group Tier is Provisional, or not started", () => {
    const provisional = player("a", {
      tier: { ...rankedTier, provisional: true, place: null, gamesOfFive: 2 },
      balanceStrength: 1349,
    });
    expect(teamsRating(provisional, "tierPoints", "en")).toMatchObject({
      kind: "new",
      value: "new",
    });
    expect(
      teamsRating(player("b", { tier: null }), "tierPoints", "en").kind,
    ).toBe("new");
  });

  it("reads Guest in a tier Group, and the stand-in OVR elsewhere", () => {
    const guest = player("g", { guest: true, ovr: 70, balanceStrength: 1231 });
    expect(teamsRating(guest, "tierPoints", "en")).toEqual({
      kind: "guest",
      value: "Guest",
      spoken: "Guest",
    });
    expect(
      teamsRating({ ...guest, balanceStrength: 70 }, "ovr", "en"),
    ).toMatchObject({ kind: "rated", value: "70" });
  });

  it("counts a side's Provisional members, never a Guest player", () => {
    const side = [
      player("a", { tier: rankedTier }),
      player("b", { tier: { ...rankedTier, provisional: true } }),
      player("c", { tier: null }),
      player("g", { guest: true }),
    ];
    expect(tierProvisionalCount(side, "tierPoints")).toBe(2);
    expect(tierProvisionalCount(side, "ovr")).toBe(0);
  });
});

describe("teamsSideAverage in a tier Group", () => {
  const side = [
    player("a", { tier: rankedTier, balanceStrength: 1296 }),
    player("b", { tier: rankedTier, balanceStrength: 1270 }),
    player("c", { tier: rankedTier, balanceStrength: 1240 }),
    player("d", { tier: rankedTier, balanceStrength: 1205 }),
  ];

  it("leaves a Provisional member's start hint out of the mean", () => {
    const provisional = player("e", {
      tier: { ...rankedTier, provisional: true },
      balanceStrength: 1164,
    });
    expect(teamsSideAverage([...side, provisional], "en")).toBe("1,253 points");
  });

  it("leaves a Guest player's stand-in out of the mean", () => {
    const guest = player("g", { guest: true, balanceStrength: 900 });
    expect(teamsSideAverage([...side, guest], "en")).toBe("1,253 points");
  });

  it("reads a dash while nobody on the side is ranked", () => {
    expect(
      teamsSideAverage(
        [player("e", { tier: null, balanceStrength: 1200 })],
        "en",
      ),
    ).toBe("–");
  });
});

describe("teamsTileName", () => {
  it("keeps the Temba name whole, and says You for the viewer", () => {
    expect(
      teamsTileName(player("a", { name: "Abdulrahman Al-Mansoor" }), "en").name,
    ).toBe("Abdulrahman Al-Mansoor");
    expect(teamsTileName(player("a", { isViewer: true }), "en").name).toBe(
      "You",
    );
  });
});

describe("otherSide", () => {
  it("names the side across", () => {
    expect(otherSide(1)).toBe(2);
    expect(otherSide(2)).toBe(1);
  });
});
