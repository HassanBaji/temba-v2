import { describe, expect, it } from "vitest";

import {
  TIER_K,
  TIER_K_PROVISIONAL,
  TIER_POINTS_START,
  tierExpectedScore,
  tierMatchDeltas,
  type TierMatchPlayer,
  type TierMatchResult,
} from "./tier-points";

function player(
  userId: string,
  points: number,
  extra: Partial<TierMatchPlayer> = {},
): TierMatchPlayer {
  return { userId, points, provisional: false, ...extra };
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
}

describe("tierExpectedScore", () => {
  it("is even between equal sides and favours the stronger one", () => {
    expect(tierExpectedScore(1200, 1200)).toBe(0.5);
    expect(tierExpectedScore(1600, 1200)).toBeCloseTo(10 / 11, 10);
    expect(
      tierExpectedScore(1300, 1250) + tierExpectedScore(1250, 1300),
    ).toBeCloseTo(1, 10);
  });
});

describe("tierMatchDeltas", () => {
  it("gives an even win half of K and takes it from the losers", () => {
    const deltas = tierMatchDeltas({
      slot1: [player("a", 1200), player("b", 1200)],
      slot2: [player("c", 1200), player("d", 1200)],
      result: "slot1",
    });
    expect(deltas.map((row) => [row.userId, row.delta])).toEqual([
      ["a", TIER_K / 2],
      ["b", TIER_K / 2],
      ["c", -TIER_K / 2],
      ["d", -TIER_K / 2],
    ]);
    expect(deltas.every((row) => row.performanceDelta === 0)).toBe(true);
    expect(deltas[0]?.expectedScore).toBe(0.5);
  });

  it("moves nobody on an even draw and rewards the weaker side's draw", () => {
    const even = tierMatchDeltas({
      slot1: [player("a", 1200)],
      slot2: [player("b", 1200)],
      result: "draw",
    });
    expect(even.map((row) => row.delta)).toEqual([0, 0]);

    const upset = tierMatchDeltas({
      slot1: [player("a", 1100)],
      slot2: [player("b", 1300)],
      result: "draw",
    });
    expect(upset[0]!.delta).toBeGreaterThan(0);
    expect(upset[1]!.delta).toBe(-upset[0]!.delta);
  });

  it("steps a Provisional player by the larger K", () => {
    const [newcomer, regular] = tierMatchDeltas({
      slot1: [
        player("new", TIER_POINTS_START, { provisional: true }),
        player("old", TIER_POINTS_START),
      ],
      slot2: [player("c", TIER_POINTS_START), player("d", TIER_POINTS_START)],
      result: "slot1",
    });
    expect(newcomer!.delta).toBe(TIER_K_PROVISIONAL / 2);
    expect(regular!.delta).toBe(TIER_K / 2);
  });

  it("matches screen 4c: K 32 and w 0.3 give +12 for the result and +6 for the rating", () => {
    const ownMean = 1250;
    const oppMean = ownMean + 400 * Math.log10(1 / 0.46 - 1);
    const [row] = tierMatchDeltas({
      slot1: [player("you", ownMean, { performance: 0.6 })],
      slot2: [player("them", oppMean)],
      result: "slot1",
      weight: 0.3,
    });
    expect(row!.expectedScore).toBeCloseTo(0.46, 10);
    expect(row!.resultDelta).toBe(12);
    expect(row!.performanceDelta).toBe(6);
    expect(row!.delta).toBe(18);
  });

  it("clamps the performance score to one either way", () => {
    const [row] = tierMatchDeltas({
      slot1: [player("a", 1200, { performance: 4 })],
      slot2: [player("b", 1200)],
      result: "draw",
      weight: 0.5,
    });
    expect(row!.performanceDelta).toBe(16);
  });

  it("sums the result part to zero for equal sides, whatever the points", () => {
    const random = seededRandom(7);
    const results: TierMatchResult[] = ["slot1", "slot2", "draw"];
    for (let run = 0; run < 500; run += 1) {
      const size = 1 + Math.floor(random() * 11);
      const side = (prefix: string) =>
        Array.from({ length: size }, (_, index) =>
          player(`${prefix}${index}`, 800 + Math.floor(random() * 900)),
        );
      const deltas = tierMatchDeltas({
        slot1: side("a"),
        slot2: side("b"),
        result: results[run % results.length]!,
      });
      const total = deltas.reduce((sum, row) => sum + row.resultDelta, 0);
      expect(total, `run ${run}`).toBe(0);
    }
  });
});
