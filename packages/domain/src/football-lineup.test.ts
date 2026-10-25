import { describe, expect, it } from "vitest";

import {
  averageLevelLabel,
  balanceFootballSides,
  footballBibName,
  footballResultLine,
  footballScorersProblem,
  footballSidesProblem,
  footballSlotCode,
  keeperSeatsLine,
  keepersInLine,
  pickFootballBib,
  positionCountsLine,
  stepFootballGoals,
} from "./football-lineup";

describe("footballSlotCode", () => {
  it("reads GK for a keeper and the position code otherwise", () => {
    expect(footballSlotCode("keeper", "mid")).toBe("GK");
    expect(footballSlotCode("outfield", "def")).toBe("DEF");
    expect(footballSlotCode(null, "fwd")).toBe("FWD");
    expect(footballSlotCode(null, null)).toBeNull();
  });
});

describe("keeper lines", () => {
  it("counts the two keeper seats down", () => {
    expect(keeperSeatsLine(0)).toBe("2 of 2 keeper seats open");
    expect(keeperSeatsLine(1)).toBe("1 of 2 keeper seats open");
    expect(keeperSeatsLine(2)).toBe("both keeper seats taken");
    expect(keepersInLine(0)).toBe("no keeper yet");
    expect(keepersInLine(1)).toBe("1 keeper, one more needed");
    expect(keepersInLine(2)).toBe("2 keepers in");
  });

  it("counts positions with keepers apart", () => {
    expect(
      positionCountsLine([
        { role: "outfield", position: "def" },
        { role: "keeper", position: "def" },
        { role: "outfield", position: "mid" },
        { role: null, position: null },
      ]),
    ).toBe("In so far: 1 DEF, 1 MID, 0 FWD, 1 GK.");
  });
});

describe("bibs", () => {
  it("names a side by its bib, defaulting to Black and White", () => {
    expect(footballBibName("navy", 1)).toBe("Dark blue");
    expect(footballBibName(null, 1)).toBe("Black");
    expect(footballBibName(null, 2)).toBe("White");
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
      { userId: "k1", role: "keeper", levelBand: "C2" },
      { userId: "a", role: "outfield", levelBand: "A" },
      { userId: "b", role: "outfield", levelBand: "B1" },
      { userId: "k2", role: "keeper", levelBand: "D3" },
      { userId: "c", role: "outfield", levelBand: "C1" },
      { userId: "d", role: "outfield", levelBand: "D1" },
    ]);
    expect(sides.slot1).toEqual(["k1", "b", "c"]);
    expect(sides.slot2).toEqual(["k2", "a", "d"]);
  });

  it("places every player once whatever the random order", () => {
    const players = Array.from({ length: 11 }, (_, index) => ({
      userId: `p${index}`,
      role: null,
      levelBand: null,
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

describe("footballSidesProblem", () => {
  const names = { slot1: "Black", slot2: "White" };

  it("blocks unplaced players, an empty side and a lopsided split", () => {
    expect(
      footballSidesProblem({ slot1: ["a"], slot2: [], unplaced: 2 }, names),
    ).toBe("2 still to place.");
    expect(
      footballSidesProblem({ slot1: ["a"], slot2: [], unplaced: 0 }, names),
    ).toBe("Both teams need players.");
    expect(
      footballSidesProblem(
        { slot1: ["a", "b", "c", "d"], slot2: ["e", "f"], unplaced: 0 },
        names,
      ),
    ).toBe("Black has 2 extra. Move one across before publishing.");
  });

  it("allows a one-player difference", () => {
    expect(
      footballSidesProblem(
        { slot1: ["a", "b", "c"], slot2: ["d", "e"], unplaced: 0 },
        names,
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
    expect(footballResultLine({ slot1: 4, slot2: 3 }, names)).toBe(
      "Black win by 1.",
    );
    expect(footballResultLine({ slot1: 1, slot2: 3 }, names)).toBe(
      "White win by 2.",
    );
    expect(footballResultLine({ slot1: 2, slot2: 2 }, names)).toBe("Draw.");
  });

  it("refuses more named goals than the Score", () => {
    expect(
      footballScorersProblem(
        { slot1: 2, slot2: 1 },
        { slot1: 3, slot2: 0 },
        names,
      ),
    ).toBe("Black scorers add up to more than 2.");
    expect(
      footballScorersProblem(
        { slot1: 2, slot2: 1 },
        { slot1: 1, slot2: 1 },
        names,
      ),
    ).toBeNull();
  });
});

describe("averageLevelLabel", () => {
  it("averages known Levels and ignores unknown ones", () => {
    expect(averageLevelLabel(["C1", "C1", null])).toBe("C+");
    expect(averageLevelLabel([null])).toBeNull();
  });
});
