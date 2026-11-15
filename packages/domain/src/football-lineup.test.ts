import { describe, expect, it } from "vitest";

import {
  balanceFootballSides,
  footballBalanceStrength,
  footballBibName,
  footballResultLine,
  footballScorersProblem,
  footballSidesProblem,
  footballSlotCode,
  footballTeamsMethodLabel,
  keeperSeatsLine,
  keepersInLine,
  pickFootballBib,
  positionCountsLine,
  stepFootballGoals,
} from "./football-lineup";

describe("footballSlotCode", () => {
  it("reads GK for a keeper and the position code otherwise", () => {
    expect(footballSlotCode("keeper", "mid", "en")).toBe("GK");
    expect(footballSlotCode("outfield", "def", "en")).toBe("DEF");
    expect(footballSlotCode(null, "fwd", "en")).toBe("FWD");
    expect(footballSlotCode(null, null, "en")).toBeNull();
  });

  it("reads the Arabic position words", () => {
    expect(footballSlotCode("keeper", "mid", "ar")).toBe("حارس");
    expect(footballSlotCode("outfield", "def", "ar")).toBe("دفاع");
    expect(footballSlotCode(null, "mid", "ar")).toBe("وسط");
    expect(footballSlotCode(null, "fwd", "ar")).toBe("هجوم");
  });
});

describe("keeper lines", () => {
  it("counts the two keeper seats down", () => {
    expect(keeperSeatsLine(0, "en")).toBe("2 of 2 keeper seats open");
    expect(keeperSeatsLine(1, "en")).toBe("1 of 2 keeper seats open");
    expect(keeperSeatsLine(2, "en")).toBe("both keeper seats taken");
    expect(keepersInLine(0, "en")).toBe("no keeper yet");
    expect(keepersInLine(1, "en")).toBe("1 keeper, one more needed");
    expect(keepersInLine(2, "en")).toBe("2 keepers in");
  });

  it("counts positions with keepers apart", () => {
    expect(
      positionCountsLine(
        [
          { role: "outfield", position: "def" },
          { role: "keeper", position: "def" },
          { role: "outfield", position: "mid" },
          { role: null, position: null },
        ],
        "en",
      ),
    ).toBe("In so far: 1 DEF, 1 MID, 0 FWD, 1 GK.");
  });
});

describe("bibs", () => {
  it("names a side by its bib, defaulting to Black and White", () => {
    expect(footballBibName("navy", 1, "en")).toBe("Dark blue");
    expect(footballBibName(null, 1, "en")).toBe("Black");
    expect(footballBibName(null, 2, "en")).toBe("White");
  });

  it("swaps the bibs when one side picks the other's colour", () => {
    expect(
      pickFootballBib({ slot1: "black", slot2: "white" }, 1, "white"),
    ).toEqual({ slot1: "white", slot2: "black" });
    expect(
      pickFootballBib({ slot1: "black", slot2: "white" }, 2, "red"),
    ).toEqual({ slot1: "black", slot2: "red" });
  });
});

describe("balanceFootballSides", () => {
  it("puts one keeper on each side and snakes the rest by Level", () => {
    const sides = balanceFootballSides([
      { userId: "k1", role: "keeper", levelBand: "C2", strength: null },
      { userId: "a", role: "outfield", levelBand: "A", strength: null },
      { userId: "b", role: "outfield", levelBand: "B1", strength: null },
      { userId: "k2", role: "keeper", levelBand: "D3", strength: null },
      { userId: "c", role: "outfield", levelBand: "C1", strength: null },
      { userId: "d", role: "outfield", levelBand: "D1", strength: null },
    ]);
    expect(sides.slot1).toEqual(["k1", "b", "c"]);
    expect(sides.slot2).toEqual(["k2", "a", "d"]);
  });

  it("places every player once whatever the random order", () => {
    const players = Array.from({ length: 11 }, (_, index) => ({
      userId: `p${index}`,
      role: null,
      levelBand: null,
      strength: null,
    }));
    let seed = 0.3;
    const sides = balanceFootballSides(players, () => {
      seed = (seed * 9301 + 0.49297) % 1;
      return seed;
    });
    expect([...sides.slot1, ...sides.slot2].sort()).toEqual(
      players.map((player) => player.userId).sort(),
    );
    expect(Math.abs(sides.slot1.length - sides.slot2.length)).toBeLessThan(2);
  });
});

describe("balanceFootballSides on Tier points", () => {
  /** Eight ranked members of a tier Group, two of them keepers. */
  const RANKED = [
    { userId: "k1", role: "keeper", points: 1180 },
    { userId: "a", role: "outfield", points: 1412 },
    { userId: "b", role: "outfield", points: 1356 },
    { userId: "k2", role: "keeper", points: 1214 },
    { userId: "c", role: "outfield", points: 1301 },
    { userId: "d", role: "outfield", points: 1248 },
    { userId: "e", role: "outfield", points: 1160 },
    { userId: "f", role: "outfield", points: 1064 },
  ] as const;
  const candidates = RANKED.map((player) => ({
    userId: player.userId,
    role: player.role,
    levelBand: "C2" as const,
    strength: player.points,
  }));
  const pointsOf = new Map<string, number>(
    RANKED.map((player) => [player.userId, player.points]),
  );
  const meanGap = (sides: { slot1: string[]; slot2: string[] }) => {
    const mean = (ids: string[]) =>
      ids.reduce((sum, id) => sum + (pointsOf.get(id) ?? 0), 0) / ids.length;
    return Math.abs(mean(sides.slot1) - mean(sides.slot2));
  };

  function seeded(seed: number) {
    let state = seed;
    return () => {
      state = (state * 16807) % 2147483647;
      return state / 2147483647;
    };
  }

  function randomSplit(random: () => number) {
    const shuffled = candidates
      .map((player) => ({ player, key: random() }))
      .sort((left, right) => left.key - right.key)
      .map((entry) => entry.player.userId);
    return { slot1: shuffled.slice(0, 4), slot2: shuffled.slice(4) };
  }

  it("leaves the sides' mean points closer than a random split does", () => {
    const balanced = meanGap(balanceFootballSides(candidates));
    const random = seeded(7);
    const gaps = Array.from({ length: 200 }, () =>
      meanGap(randomSplit(random)),
    );
    const randomGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    expect(balanced).toBeLessThan(randomGap);
  });

  it("still deals the keepers first, one to a side, then snakes by points", () => {
    const sides = balanceFootballSides(candidates);
    expect(sides.slot1).toEqual(["k1", "b", "c", "f"]);
    expect(sides.slot2).toEqual(["k2", "a", "d", "e"]);
  });

  it("keeps the split even whatever the random order", () => {
    const sides = balanceFootballSides(candidates, seeded(3));
    expect(sides.slot1[0]).toBe("k1");
    expect(sides.slot2[0]).toBe("k2");
    expect(meanGap(sides)).toBe(meanGap(balanceFootballSides(candidates)));
  });

  it("orders by Level band when any player has no strength", () => {
    const sides = balanceFootballSides([
      { userId: "a", role: null, levelBand: "D3", strength: 1500 },
      { userId: "b", role: null, levelBand: "A", strength: null },
      { userId: "c", role: null, levelBand: "B1", strength: 900 },
      { userId: "d", role: null, levelBand: "C2", strength: 1000 },
    ]);
    expect(sides.slot1).toEqual(["b", "a"]);
    expect(sides.slot2).toEqual(["c", "d"]);
  });
});

describe("footballBalanceStrength", () => {
  it("is the Tier points of a ranked member", () => {
    expect(
      footballBalanceStrength({
        tierPoints: 1301,
        tierProvisional: false,
        ovrHint: 1500,
      }),
    ).toBe(1301);
  });

  it("is the start hint of a Provisional member, not their 1,200", () => {
    expect(
      footballBalanceStrength({
        tierPoints: 1200,
        tierProvisional: true,
        ovrHint: 1340,
      }),
    ).toBe(1340);
  });

  it("keeps a Provisional member's points when there is no hint", () => {
    expect(
      footballBalanceStrength({
        tierPoints: 1230,
        tierProvisional: true,
        ovrHint: null,
      }),
    ).toBe(1230);
  });

  it("is null outside a tier Group, where the Level band decides", () => {
    expect(
      footballBalanceStrength({
        tierPoints: null,
        tierProvisional: false,
        ovrHint: 1300,
      }),
    ).toBeNull();
  });
});

describe("footballSidesProblem", () => {
  const names = { slot1: "Black", slot2: "White" };

  it("blocks unplaced players, an empty side and a lopsided split", () => {
    expect(
      footballSidesProblem(
        { slot1: ["a"], slot2: [], unplaced: 2 },
        names,
        "en",
      ),
    ).toBe("2 still to place.");
    expect(
      footballSidesProblem(
        { slot1: ["a"], slot2: [], unplaced: 0 },
        names,
        "en",
      ),
    ).toBe("Both teams need players.");
    expect(
      footballSidesProblem(
        { slot1: ["a", "b", "c", "d"], slot2: ["e", "f"], unplaced: 0 },
        names,
        "en",
      ),
    ).toBe("Black has 2 extra. Move one across before publishing.");
  });

  it("allows a one-player difference", () => {
    expect(
      footballSidesProblem(
        { slot1: ["a", "b", "c"], slot2: ["d", "e"], unplaced: 0 },
        names,
        "en",
      ),
    ).toBeNull();
  });
});

describe("score", () => {
  const names = { slot1: "Black", slot2: "White" };

  it("steps goals within bounds", () => {
    expect(stepFootballGoals(0, -1)).toBe(0);
    expect(stepFootballGoals(4, 1)).toBe(5);
    expect(stepFootballGoals(99, 1)).toBe(99);
  });

  it("reads the winner and the margin", () => {
    expect(footballResultLine({ slot1: 4, slot2: 3 }, names, "en")).toBe(
      "Black win by 1.",
    );
    expect(footballResultLine({ slot1: 1, slot2: 3 }, names, "en")).toBe(
      "White win by 2.",
    );
    expect(footballResultLine({ slot1: 2, slot2: 2 }, names, "en")).toBe(
      "Draw.",
    );
  });

  it("refuses more named goals than the Score", () => {
    expect(
      footballScorersProblem(
        { slot1: 2, slot2: 1 },
        { slot1: 3, slot2: 0 },
        names,
        "en",
      ),
    ).toBe("Black scorers add up to more than 2.");
    expect(
      footballScorersProblem(
        { slot1: 2, slot2: 1 },
        { slot1: 1, slot2: 1 },
        names,
        "en",
      ),
    ).toBeNull();
  });
});

describe("Arabic copy", () => {
  it("reads keeper seats, bibs and the result line in Arabic", () => {
    expect(keeperSeatsLine(2, "ar")).toBe("مكانا الحارسين محجوزان");
    expect(footballBibName("navy", 1, "ar")).toBe("أزرق داكن");
    expect(footballTeamsMethodLabel("level", "ar")).toBe("متوازنة حسب المستوى");
    expect(
      footballResultLine(
        { slot1: 4, slot2: 3 },
        { slot1: "أسود", slot2: "أبيض" },
        "ar",
      ),
    ).toBe("أسود يفوز بفارق 1.");
  });
});
