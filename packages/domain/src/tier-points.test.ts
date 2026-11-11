import { describe, expect, it } from "vitest";

import {
  TIER_K,
  TIER_K_PROVISIONAL,
  TIER_POINTS_START,
  tierExpectedScore,
  tierHintFor,
  tierHintOvr,
  tierMatchDeltas,
  tierStartHint,
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

describe("tierStartHint", () => {
  const group = {
    groupMedianPoints: 1201,
    groupMedianOvr: 65,
    groupMinPoints: 1064,
    groupMaxPoints: 1412,
  };

  it("adds ten points per OVR point above the Group's median", () => {
    expect(tierStartHint({ ...group, ovr: 71 })).toBe(1261);
    expect(tierStartHint({ ...group, ovr: 61 })).toBe(1161);
    expect(tierStartHint({ ...group, ovr: 65 })).toBe(1201);
  });

  it("stays inside the Group's range", () => {
    expect(tierStartHint({ ...group, ovr: 99 })).toBe(1412);
    expect(tierStartHint({ ...group, ovr: 40 })).toBe(1064);
  });

  it("rounds to a whole point", () => {
    expect(tierStartHint({ ...group, ovr: 72.45 })).toBe(1276);
  });
});

describe("tierHintFor", () => {
  const reference = {
    medianPoints: 1200,
    medianOvr: 60,
    minPoints: 1000,
    maxPoints: 1400,
  };

  it("needs an OVR and a reference", () => {
    expect(tierHintFor(70, reference)).toBe(1300);
    expect(tierHintFor(null, reference)).toBeNull();
    expect(tierHintFor(70, null)).toBeNull();
  });
});

describe("tierHintOvr", () => {
  it("reads the Temba Level as OVR", () => {
    expect(tierHintOvr({ level: 7, groupLevel: null })).toBe(99);
  });

  it("prefers a Group Level an Organizer set earlier", () => {
    expect(tierHintOvr({ level: 7, groupLevel: 0 })).toBe(40);
  });

  it("is null without a Level", () => {
    expect(tierHintOvr({ level: null, groupLevel: null })).toBeNull();
    expect(tierHintOvr({ level: Number.NaN, groupLevel: null })).toBeNull();
  });
});
