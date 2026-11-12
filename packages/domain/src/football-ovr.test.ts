import { describe, expect, it } from "vitest";

import {
  footballGoalsRole,
  footballGoalsScores,
  footballMvpScores,
  footballPhiAfterMatches,
  formatOvr,
  formatOvrDelta,
  formatOvrPrecise,
  levelFaceFor,
  levelFromOvr,
  muFromOvr,
  ovrFromLevel,
  ovrBalanceStrength,
  ovrFromMu,
  rateFootballMatch,
  wholeOvrFromMu,
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

describe("ovrBalanceStrength", () => {
  it("balances on the whole-number OVR, a new Rating's without one", () => {
    expect(wholeOvrFromMu(muFromOvr(72.4))).toBe(72);
    expect(ovrBalanceStrength(muFromOvr(83.6))).toBe(84);
    expect(ovrBalanceStrength(null)).toBe(65);
    expect(ovrBalanceStrength(undefined)).toBe(65);
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

const PARTS = [
  "resultPart",
  "performancePart",
  "goalsPart",
  "mvpPart",
] as const;

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

describe("rateFootballMatch with all four parts", () => {
  it("keeps each of the four parts zero-sum across the Match (property)", () => {
    const random = seededRandom(42);
    const pick = <T>(values: readonly T[]) =>
      values[Math.floor(random() * values.length)]!;
    const roles = ["keeper", "def", "mid", "fwd"] as const;
    for (let run = 0; run < 300; run++) {
      const side = (prefix: string, size: number) =>
        Array.from({ length: size }, (_, index) => ({
          userId: `${prefix}${index}`,
          mu: muFromOvr(40 + random() * 59),
          phi: random() < 0.3 ? INITIAL_PHI : CONFIRMED_PHI,
          goals: Math.floor(random() * 3),
          goalsRole: pick(roles),
          performance: random() < 0.25 ? null : random() * 2 - 1,
        }));
      const slot1 = side("a", 1 + Math.floor(random() * 7));
      const slot2 = side("b", 1 + Math.floor(random() * 7));
      const named = (players: typeof slot1) =>
        players.reduce((sum, player) => sum + player.goals, 0);
      const score = {
        slot1: named(slot1) + Math.floor(random() * 2),
        slot2: named(slot2) + Math.floor(random() * 2),
      };
      const everyone = [...slot1, ...slot2];
      const moves = rateFootballMatch({
        slot1,
        slot2,
        outcome: pick(["slot1", "slot2", "draw"] as const),
        weight: pick([1, 0.5]),
        score,
        votedMvpUserId: random() < 0.7 ? pick(everyone).userId : null,
      });
      expect(moves).toHaveLength(everyone.length);
      for (const part of PARTS) {
        expect(moves.reduce((sum, move) => sum + move[part], 0)).toBeCloseTo(
          0,
          9,
        );
      }
    }
  });

  it("adds the four parts to the move", () => {
    const moves = rateFootballMatch({
      slot1: players("a", [70, 72]).map((player, index) => ({
        ...player,
        goals: index === 0 ? 2 : 0,
        performance: index === 0 ? 0.5 : -0.2,
      })),
      slot2: players("b", [71, 73]).map((player) => ({
        ...player,
        goals: player.userId === "b0" ? 1 : 0,
        performance: 0,
      })),
      outcome: "slot1",
      weight: 1,
      score: { slot1: 2, slot2: 1 },
      votedMvpUserId: "a0",
    });
    for (const move of moves) {
      expect(move.ovrAfter - move.ovrBefore).toBeCloseTo(
        move.resultPart + move.performancePart + move.goalsPart + move.mvpPart,
        10,
      );
    }
    const star = moves.find((move) => move.userId === "a0")!;
    expect(star.performancePart).toBeGreaterThan(0);
    expect(star.goalsPart).toBeGreaterThan(0);
    expect(star.mvpPart).toBeCloseTo(0.3);
  });

  it("scores no MVP part without a voted MVP", () => {
    for (const votedMvpUserId of [null, undefined, "not-on-the-match"]) {
      const moves = rateFootballMatch({
        slot1: players("a", [70, 70]),
        slot2: players("b", [70, 70]),
        outcome: "slot1",
        weight: 1,
        votedMvpUserId,
      });
      expect(moves.every((move) => move.mvpPart === 0)).toBe(true);
    }
  });

  it("gives a voted MVP +K × weight × 0.1 against an even field, the rest share the minus", () => {
    const moves = rateFootballMatch({
      slot1: players("a", [70, 70]),
      slot2: players("b", [70, 70]),
      outcome: "draw",
      weight: 1,
      votedMvpUserId: "b1",
    });
    expect(moves.find((move) => move.userId === "b1")?.mvpPart).toBeCloseTo(
      0.3,
    );
    expect(moves.find((move) => move.userId === "a0")?.mvpPart).toBeCloseTo(
      -0.1,
    );
  });

  it("leaves a player with no settled rating at 0 and keeps the rated ones zero-sum", () => {
    const moves = rateFootballMatch({
      slot1: [
        { ...players("a", [70])[0]!, performance: 0.6 },
        { ...players("c", [70])[0]!, performance: null },
      ],
      slot2: [
        { ...players("b", [70], INITIAL_PHI)[0]!, performance: -0.6 },
        players("d", [70])[0]!,
      ],
      outcome: "draw",
      weight: 1,
    });
    expect(moves.find((move) => move.userId === "c0")?.performancePart).toBe(0);
    expect(moves.find((move) => move.userId === "d0")?.performancePart).toBe(0);
    expect(
      moves.reduce((sum, move) => sum + move.performancePart, 0),
    ).toBeCloseTo(0, 10);
    expect(
      moves.find((move) => move.userId === "a0")?.performancePart,
    ).toBeGreaterThan(0);
  });

  it("takes more from the keeper than a forward on a side that conceded more than half the goals", () => {
    const slot1 = players("a", [70, 70, 70]).map((player, index) => ({
      ...player,
      goalsRole: (["keeper", "fwd", "mid"] as const)[index],
    }));
    const slot2 = players("b", [70, 70, 70]).map((player, index) => ({
      ...player,
      goals: index === 0 ? 4 : 0,
      goalsRole: (["fwd", "keeper", "def"] as const)[index],
    }));
    const moves = rateFootballMatch({
      slot1: [
        { ...slot1[0]!, goals: 0 },
        { ...slot1[1]!, goals: 1 },
        slot1[2]!,
      ],
      slot2,
      outcome: "slot2",
      weight: 1,
      score: { slot1: 1, slot2: 4 },
    });
    const keeper = moves.find((move) => move.userId === "a0")!;
    const forward = moves.find((move) => move.userId === "a1")!;
    expect(keeper.goalsPart).toBeLessThan(0);
    expect(keeper.goalsPart).toBeLessThan(forward.goalsPart);

    const sameGoals = rateFootballMatch({
      slot1: [
        { ...slot1[0]!, goals: 0 },
        { ...slot1[1]!, goals: 0 },
      ],
      slot2: players("b", [70, 70]).map((player) => ({
        ...player,
        goals: player.userId === "b0" ? 10 : 0,
      })),
      outcome: "slot2",
      weight: 1,
      score: { slot1: 0, slot2: 10 },
    });
    expect(
      sameGoals.find((move) => move.userId === "a0")!.goalsPart,
    ).toBeLessThan(sameGoals.find((move) => move.userId === "a1")!.goalsPart);
  });
});

describe("footballGoalsScores", () => {
  it("puts the keeper of a side that conceded everything at −1 and scores a goalless Match 0", () => {
    const scores = footballGoalsScores(
      [
        { userId: "k", side: 1, goals: 0, goalsRole: "keeper" },
        { userId: "f", side: 1, goals: 0, goalsRole: "fwd" },
        { userId: "s", side: 2, goals: 3, goalsRole: "fwd" },
        { userId: "t", side: 2, goals: 0, goalsRole: "mid" },
      ],
      { slot1: 0, slot2: 3 },
    );
    expect(scores.get("k")).toBe(-1);
    expect(scores.get("f")).toBeCloseTo((-0.75 - 0.2 * 1.5) / 1.5);
    expect(scores.get("s")).toBe(1);
    expect(
      footballGoalsScores([{ userId: "k", side: 1 }], {
        slot1: 0,
        slot2: 0,
      }).size,
    ).toBe(0);
  });
});

describe("footballGoalsRole", () => {
  it("weighs a keeper as a keeper and an outfield player by Position, midfield when unset", () => {
    expect(footballGoalsRole("keeper", "fwd")).toBe("keeper");
    expect(footballGoalsRole("outfield", "def")).toBe("def");
    expect(footballGoalsRole(null, null)).toBe("mid");
  });
});

describe("footballMvpScores", () => {
  it("is +1 for the MVP and −1 / (n − 1) for each other player", () => {
    const scores = footballMvpScores(["a", "b", "c", "d", "e"], "c");
    expect(scores.get("c")).toBe(1);
    expect(scores.get("a")).toBe(-0.25);
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
