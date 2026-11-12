import { describe, expect, it } from "vitest";

import {
  footballPhiAfterMatches,
  formatOvr,
  formatOvrDelta,
  formatOvrPrecise,
  levelFaceFor,
  levelFromOvr,
  muFromOvr,
  ovrFromLevel,
  ovrFromMu,
  rateFootballMatch,
  type FootballMatchPlayer,
} from "./football-ovr";
import {
  BAND_MIDPOINTS,
  bandFromLevel,
  INITIAL_PHI,
  isProvisional,
  muFromBand,
  ratedMatchesRemainingToConfirm,
} from "./level";
import { displayLabelFromStoredBand } from "./level-bands";

describe("ovrFromLevel", () => {
  it("maps the Level scale onto 40 to 99", () => {
    expect(ovrFromLevel(0)).toBe(40);
    expect(ovrFromLevel(7)).toBe(99);
  });

  it("reads the self-placed football bands as Beginner 43, Casual 61, Competitive 72, Pro 78", () => {
    expect(
      [
        BAND_MIDPOINTS.D3,
        BAND_MIDPOINTS.C3,
        BAND_MIDPOINTS.C1,
        BAND_MIDPOINTS.B3,
      ].map((level) => Math.round(ovrFromLevel(level))),
    ).toEqual([43, 61, 72, 78]);
  });

  it("keeps the Level bands: C+ runs from 69.5 to 75.4", () => {
    expect(ovrFromLevel(3.5)).toBeCloseTo(69.5);
    expect(ovrFromLevel(4.2)).toBeCloseTo(75.4);
  });
});

describe("levelFromOvr", () => {
  it("is the inverse of ovrFromLevel", () => {
    for (const level of [0, 0.35, 2.45, 3.85, 4.55, 7]) {
      expect(levelFromOvr(ovrFromLevel(level))).toBeCloseTo(level);
    }
  });

  it("reads an OVR of 74 inside C+", () => {
    expect(displayLabelFromStoredBand(bandFromLevel(levelFromOvr(74)))).toBe(
      "C+",
    );
  });

  it("clamps an OVR outside 40 to 99", () => {
    expect(levelFromOvr(20)).toBe(0);
    expect(levelFromOvr(120)).toBe(7);
  });
});

describe("ovrFromMu and muFromOvr", () => {
  it("read the stored μ of a self-placed Competitive as OVR 72", () => {
    expect(Math.round(ovrFromMu(muFromBand("C1")))).toBe(72);
  });

  it("round-trip", () => {
    expect(ovrFromMu(muFromOvr(74))).toBeCloseTo(74);
  });
});

describe("formatOvr", () => {
  it("shows a whole number inside 40 to 99", () => {
    expect(formatOvr(72.46)).toBe("72");
    expect(formatOvr(74.5)).toBe("75");
    expect(formatOvr(12)).toBe("40");
    expect(formatOvr(140)).toBe("99");
  });
});

describe("levelFaceFor", () => {
  it("reads football as OVR and padel as the Level", () => {
    expect(levelFaceFor("football")).toBe("ovr");
    expect(levelFaceFor("padel")).toBe("level");
  });
});

const CONFIRMED_PHI = footballPhiAfterMatches(5);

function players(
  prefix: string,
  ovrs: readonly number[],
  phi = CONFIRMED_PHI,
): FootballMatchPlayer[] {
  return ovrs.map((ovr, index) => ({
    userId: `${prefix}${index}`,
    mu: muFromOvr(ovr),
    phi,
  }));
}

function sumOfResultParts(moves: ReturnType<typeof rateFootballMatch>) {
  return moves.reduce((sum, move) => sum + move.resultPart, 0);
}

describe("rateFootballMatch", () => {
  it("moves a confirmed player +0.6 OVR for an even win at weight 1 (screen 5a)", () => {
    const moves = rateFootballMatch({
      slot1: players("a", [74, 76, 78]),
      slot2: players("b", [76, 76, 76]),
      outcome: "slot1",
      weight: 1,
    });
    const winner = moves.find((move) => move.userId === "a0");
    expect(winner?.expected).toBeCloseTo(0.5);
    expect(winner?.resultPart).toBeCloseTo(0.6);
    expect(winner?.ovrAfter).toBeCloseTo(74.6);
    const loser = moves.find((move) => move.userId === "b0");
    expect(loser?.resultPart).toBeCloseTo(-0.6);
  });

  it("halves the move at weight 0.5 and doubles it while Provisional", () => {
    const half = rateFootballMatch({
      slot1: players("a", [70, 70]),
      slot2: players("b", [70, 70]),
      outcome: "slot1",
      weight: 0.5,
    });
    expect(half[0]?.resultPart).toBeCloseTo(0.3);
    const provisional = rateFootballMatch({
      slot1: players("a", [70, 70], INITIAL_PHI),
      slot2: players("b", [70, 70], INITIAL_PHI),
      outcome: "slot2",
      weight: 1,
    });
    expect(provisional[0]?.resultPart).toBeCloseTo(-1.2);
    expect(provisional[2]?.resultPart).toBeCloseTo(1.2);
  });

  it("moves an even draw by nothing and an upset draw towards the underdog", () => {
    const even = rateFootballMatch({
      slot1: players("a", [70, 70]),
      slot2: players("b", [70, 70]),
      outcome: "draw",
      weight: 1,
    });
    expect(even.every((move) => move.resultPart === 0)).toBe(true);
    const upset = rateFootballMatch({
      slot1: players("a", [60, 60]),
      slot2: players("b", [80, 80]),
      outcome: "draw",
      weight: 1,
    });
    expect(upset[0]?.resultPart).toBeGreaterThan(0);
    expect(upset[2]?.resultPart).toBeLessThan(0);
  });

  it("rewards beating a stronger side more than beating a weaker one", () => {
    const upset = rateFootballMatch({
      slot1: players("a", [60]),
      slot2: players("b", [80]),
      outcome: "slot1",
      weight: 1,
    });
    const expected = rateFootballMatch({
      slot1: players("a", [80]),
      slot2: players("b", [60]),
      outcome: "slot1",
      weight: 1,
    });
    expect(upset[0]?.resultPart).toBeGreaterThan(
      expected[0]?.resultPart ?? Infinity,
    );
  });

  it("keeps the result part zero-sum across the Match", () => {
    const outcomes = ["slot1", "slot2", "draw"] as const;
    const cases = [
      { slot1: players("a", [74, 76, 78]), slot2: players("b", [70, 81]) },
      {
        slot1: [
          ...players("a", [55, 62], INITIAL_PHI),
          ...players("c", [90, 41]),
        ],
        slot2: players("b", [66, 70, 74, 80, 99], 290),
      },
      { slot1: players("a", [40]), slot2: players("b", [99, 98, 97]) },
    ];
    for (const sides of cases) {
      for (const outcome of outcomes) {
        for (const weight of [1, 0.5]) {
          const moves = rateFootballMatch({ ...sides, outcome, weight });
          expect(moves).toHaveLength(sides.slot1.length + sides.slot2.length);
          expect(sumOfResultParts(moves)).toBeCloseTo(0, 10);
        }
      }
    }
  });

  it("clamps OVR to 40 to 99", () => {
    const moves = rateFootballMatch({
      slot1: players("a", [99], INITIAL_PHI),
      slot2: players("b", [40], INITIAL_PHI),
      outcome: "slot2",
      weight: 1,
    });
    expect(moves[0]?.ovrAfter).toBeLessThan(99);
    const top = rateFootballMatch({
      slot1: players("a", [98.9], INITIAL_PHI),
      slot2: players("b", [99], INITIAL_PHI),
      outcome: "slot1",
      weight: 1,
    });
    expect(top[0]?.ovrAfter).toBe(99);
  });

  it("rates nothing when a side is empty", () => {
    expect(
      rateFootballMatch({
        slot1: [],
        slot2: players("b", [70]),
        outcome: "slot2",
        weight: 1,
      }),
    ).toEqual([]);
  });
});

describe("footballPhiAfterMatches", () => {
  it("is Provisional until the fifth counting Match and confirmed after it", () => {
    for (const counted of [0, 1, 2, 3, 4]) {
      expect(isProvisional(footballPhiAfterMatches(counted))).toBe(true);
    }
    expect(isProvisional(footballPhiAfterMatches(5))).toBe(false);
    expect(isProvisional(footballPhiAfterMatches(12))).toBe(false);
  });

  it("counts down the Matches left to confirm one at a time", () => {
    expect(
      [0, 1, 2, 3, 4, 5].map((counted) =>
        ratedMatchesRemainingToConfirm(footballPhiAfterMatches(counted)),
      ),
    ).toEqual([5, 4, 3, 2, 1, 0]);
  });
});

describe("formatOvrDelta", () => {
  it("signs a move in one decimal", () => {
    expect(formatOvrDelta(0.6)).toBe("+0.6");
    expect(formatOvrDelta(-0.64)).toBe("−0.6");
    expect(formatOvrDelta(0.02)).toBe("0");
    expect(formatOvrPrecise(74.24)).toBe("74.2");
  });
});
