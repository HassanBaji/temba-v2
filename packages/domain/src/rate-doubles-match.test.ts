import { describe, expect, it } from "vitest";

import { glicko2Step } from "./glicko2";
import { IDLE_PERIOD_MS } from "./idle";
import {
  bandWithHysteresis,
  initialRatingFromChoice,
  levelFromMu,
  type SelfDeclareChoice,
} from "./level";
import {
  DOUBLES_PARTNER_WEIGHT,
  rateDoublesMatch,
  type DoublesPlayerInput,
} from "./rate-doubles-match";

const now = new Date("2026-06-01T12:00:00Z");

function player(mu: number, phi = 200): DoublesPlayerInput {
  return {
    state: { mu, phi, sigma: 0.06, levelBand: "C2" },
    lastRatedAt: now,
  };
}

const strong: [DoublesPlayerInput, DoublesPlayerInput] = [
  player(1700),
  player(1600),
];
const weak: [DoublesPlayerInput, DoublesPlayerInput] = [
  player(1400),
  player(1500),
];

describe("rateDoublesMatch", () => {
  it("raises the winners and lowers the losers at full weight", () => {
    const result = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "slot1",
      weight: 1,
      now,
    });

    expect(result.slot1.map((p) => p.score)).toEqual([1, 1]);
    expect(result.slot2.map((p) => p.score)).toEqual([0, 0]);
    for (const winner of result.slot1) {
      expect(winner.after.mu).toBeGreaterThan(winner.before.mu);
    }
    for (const loser of result.slot2) {
      expect(loser.after.mu).toBeLessThan(loser.before.mu);
    }
  });

  it("steps each player against the opposing pair shifted by half the gap to their partner", () => {
    const result = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "slot1",
      weight: 1,
      now,
    });

    expect(DOUBLES_PARTNER_WEIGHT).toBe(1);
    expect(result.slot1[0].after).toEqual(
      glicko2Step(strong[0].state, { mu: 1500, phi: 200 }, 1),
    );
    expect(result.slot1[1].after).toEqual(
      glicko2Step(strong[1].state, { mu: 1400, phi: 200 }, 1),
    );
    expect(result.slot2[0].after).toEqual(
      glicko2Step(weak[0].state, { mu: 1600, phi: 200 }, 0),
    );
    expect(result.slot2[1].after).toEqual(
      glicko2Step(weak[1].state, { mu: 1700, phi: 200 }, 0),
    );
  });

  it("moves four players of equal μ exactly as the opposing pair's mean did", () => {
    const even: [DoublesPlayerInput, DoublesPlayerInput] = [
      player(1500, 120),
      player(1500, 300),
    ];
    const others: [DoublesPlayerInput, DoublesPlayerInput] = [
      player(1500, 200),
      player(1500, 80),
    ];
    const result = rateDoublesMatch({
      slot1: even,
      slot2: others,
      outcome: "slot1",
      weight: 0.5,
      now,
    });

    const versusSlot2 = { mu: 1500, phi: 140 };
    const versusSlot1 = { mu: 1500, phi: 210 };
    const halfStep = (state: DoublesPlayerInput["state"], score: 0 | 1) => {
      const star = glicko2Step(
        state,
        score === 1 ? versusSlot2 : versusSlot1,
        score,
      );
      return {
        mu: state.mu + 0.5 * (star.mu - state.mu),
        phi: state.phi + 0.5 * (star.phi - state.phi),
        sigma: state.sigma + 0.5 * (star.sigma - state.sigma),
      };
    };
    expect(result.slot1[0].after).toEqual(halfStep(even[0].state, 1));
    expect(result.slot1[1].after).toEqual(halfStep(even[1].state, 1));
    expect(result.slot2[0].after).toEqual(halfStep(others[0].state, 0));
    expect(result.slot2[1].after).toEqual(halfStep(others[1].state, 0));
  });

  it("gives a weak player beside a strong partner less for a win, and the partner more", () => {
    const mixed: [DoublesPlayerInput, DoublesPlayerInput] = [
      player(1300),
      player(1700),
    ];
    const even: [DoublesPlayerInput, DoublesPlayerInput] = [
      player(1500),
      player(1500),
    ];
    const result = rateDoublesMatch({
      slot1: mixed,
      slot2: even,
      outcome: "slot1",
      weight: 1,
      now,
    });

    const pairMean = { mu: 1500, phi: 200 };
    const ignoringPartner = mixed.map(
      (p) => glicko2Step(p.state, pairMean, 1).mu - p.state.mu,
    );
    const gains = result.slot1.map((p) => p.after.mu - p.before.mu);

    expect(gains[0]).toBeGreaterThan(0);
    expect(gains[0]).toBeLessThan(ignoringPartner[0]!);
    expect(gains[1]).toBeGreaterThan(ignoringPartner[1]!);
    expect(gains[0]).toBeCloseTo(gains[1]!, 10);
  });

  it("scores a loss for slot1 when slot2 wins", () => {
    const result = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "slot2",
      weight: 1,
      now,
    });

    expect(result.slot1.map((p) => p.score)).toEqual([0, 0]);
    expect(result.slot2.map((p) => p.score)).toEqual([1, 1]);
    expect(result.slot1[0].after.mu).toBeLessThan(result.slot1[0].before.mu);
  });

  it("scores a draw as 0.5 and favours the weaker side", () => {
    const result = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "draw",
      weight: 1,
      now,
    });

    for (const p of [...result.slot1, ...result.slot2]) {
      expect(p.score).toBe(0.5);
    }
    expect(result.slot1[0].after.mu).toBeLessThan(result.slot1[0].before.mu);
    expect(result.slot2[0].after.mu).toBeGreaterThan(result.slot2[0].before.mu);
  });

  it("moves ratings half as far at half weight", () => {
    const full = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "slot1",
      weight: 1,
      now,
    });
    const half = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "slot1",
      weight: 0.5,
      now,
    });

    const before = strong[0].state;
    const fullDelta = full.slot1[0].after.mu - before.mu;
    const halfDelta = half.slot1[0].after.mu - before.mu;
    expect(halfDelta).toBeCloseTo(fullDelta / 2, 10);
    expect(half.slot1[0].after.phi - before.phi).toBeCloseTo(
      (full.slot1[0].after.phi - before.phi) / 2,
      10,
    );
  });

  it("inflates idle players before rating and reports the inflated state as before", () => {
    const idle: DoublesPlayerInput = {
      state: player(1500, 100).state,
      lastRatedAt: new Date(now.getTime() - 2 * IDLE_PERIOD_MS),
    };
    const result = rateDoublesMatch({
      slot1: [idle, player(1500, 100)],
      slot2: weak,
      outcome: "slot1",
      weight: 1,
      now,
    });

    expect(result.slot1[0].before.phi).toBeGreaterThan(100);
    expect(result.slot1[1].before.phi).toBe(100);
  });

  it("keeps the Level band inside hysteresis", () => {
    const result = rateDoublesMatch({
      slot1: strong,
      slot2: weak,
      outcome: "slot1",
      weight: 0.5,
      now,
    });

    expect(result.slot1[0].levelBand).toBe(
      bandWithHysteresis(levelFromMu(result.slot1[0].after.mu), "C2"),
    );
  });
});

describe("rateDoublesMatch with low Reliability (ADR-0095)", () => {
  const even = (lossFactor?: number): DoublesPlayerInput => ({
    ...player(1500, 150),
    lossFactor,
  });

  it("moves a loser further and leaves a winner alone", () => {
    const plain = rateDoublesMatch({
      slot1: [even(), even()],
      slot2: [even(), even()],
      outcome: "slot1",
      weight: 1,
      now,
    });
    const low = rateDoublesMatch({
      slot1: [even(1.5), even()],
      slot2: [even(1.5), even()],
      outcome: "slot1",
      weight: 1,
      now,
    });

    expect(low.slot1[0].after.mu).toBe(plain.slot1[0].after.mu);
    expect(low.slot1[0].reliabilityPart).toBe(0);

    const plainLoss = plain.slot2[0].after.mu - plain.slot2[0].before.mu;
    const lowLoss = low.slot2[0].after.mu - low.slot2[0].before.mu;
    expect(plainLoss).toBeLessThan(0);
    expect(lowLoss).toBeCloseTo(plainLoss * 1.5, 8);
    expect(low.slot2[0].reliabilityPart).toBeCloseTo(plainLoss * 0.5, 8);
    expect(low.slot2[1].after.mu).toBe(plain.slot2[1].after.mu);
    expect(low.slot2[0].after.phi).toBe(plain.slot2[0].after.phi);
  });

  it("never softens a loss", () => {
    const plain = rateDoublesMatch({
      slot1: [even(), even()],
      slot2: [even(), even()],
      outcome: "slot1",
      weight: 1,
      now,
    });
    const odd = rateDoublesMatch({
      slot1: [even(), even()],
      slot2: [even(0.2), even()],
      outcome: "slot1",
      weight: 1,
      now,
    });
    expect(odd.slot2[0].after.mu).toBe(plain.slot2[0].after.mu);
  });
});

describe("A new padel declarer's first even win against settled players", () => {
  function firstWinMove(choice: SelfDeclareChoice) {
    const start = initialRatingFromChoice(choice, "padel");
    const settled = (): DoublesPlayerInput => ({
      state: { ...start, phi: 100 },
      lastRatedAt: now,
    });
    const result = rateDoublesMatch({
      slot1: [{ state: start, lastRatedAt: now }, settled()],
      slot2: [settled(), settled()],
      outcome: "slot1",
      weight: 1,
      now,
    });
    return levelFromMu(result.slot1[0].after.mu) - levelFromMu(start.mu);
  }

  it("moves a D declarer about 0.11 Level, a C- about 0.17 and a C about 0.23", () => {
    expect(firstWinMove("D3")).toBeCloseTo(0.11, 2);
    expect(firstWinMove("C3")).toBeCloseTo(0.17, 2);
    expect(firstWinMove("C2")).toBeCloseTo(0.23, 2);
  });

  it('still moves "I don\'t know" about 0.35 Level', () => {
    expect(firstWinMove("unknown")).toBeCloseTo(0.35, 1);
  });
});

describe("rateDoublesMatch under the Prove-it rule (ADR-0097)", () => {
  const at = (
    mu: number,
    extra: Partial<DoublesPlayerInput> = {},
  ): DoublesPlayerInput => ({ ...player(mu, 150), ...extra });

  function play(
    loser: DoublesPlayerInput,
    options: {
      partner?: DoublesPlayerInput;
      winners?: [DoublesPlayerInput, DoublesPlayerInput];
      outcome?: "slot1" | "slot2" | "draw";
      weight?: number;
    } = {},
  ) {
    return rateDoublesMatch({
      slot1: options.winners ?? [at(1500), at(1500)],
      slot2: [loser, options.partner ?? at(1500)],
      outcome: options.outcome ?? "slot1",
      weight: options.weight ?? 1,
      now,
    });
  }

  function moveOf(result: { before: { mu: number }; after: { mu: number } }) {
    return result.after.mu - result.before.mu;
  }

  it("moves a covered player who lost to a pair at their level one and a half times as far", () => {
    const plain = play(at(1500));
    const proven = play(at(1500, { proveIt: true }));

    const plainLoss = moveOf(plain.slot2[0]);
    expect(plainLoss).toBeLessThan(0);
    expect(moveOf(proven.slot2[0])).toBeCloseTo(plainLoss * 1.5, 8);
    expect(proven.slot2[0].proveItPart).toBeCloseTo(plainLoss * 0.5, 8);
    expect(proven.slot2[0].reliabilityPart).toBeCloseTo(0, 12);
    expect(proven.slot2[0].after.phi).toBe(plain.slot2[0].after.phi);
    expect(proven.slot2[0].after.sigma).toBe(plain.slot2[0].after.sigma);
  });

  it("moves the partner and both opponents exactly as without the rule", () => {
    const plain = play(at(1500));
    const proven = play(at(1500, { proveIt: true }));

    expect(proven.slot2[1]).toEqual(plain.slot2[1]);
    expect(proven.slot1).toEqual(plain.slot1);
  });

  it("adds nothing on a win or a draw", () => {
    for (const outcome of ["slot2", "draw"] as const) {
      const plain = play(at(1500), { outcome });
      const proven = play(at(1500, { proveIt: true }), { outcome });
      expect(proven.slot2[0].after).toEqual(plain.slot2[0].after);
      expect(proven.slot2[0].proveItPart).toBe(0);
    }
  });

  it("adds nothing when the pair's expected score is below 0.25 or above 0.75", () => {
    const outside: [DoublesPlayerInput, DoublesPlayerInput][] = [
      [at(1800), at(1800)],
      [at(1200), at(1200)],
    ];
    for (const winners of outside) {
      const plain = play(at(1500), { winners });
      const proven = play(at(1500, { proveIt: true }), { winners });
      expect(proven.slot2[0].after).toEqual(plain.slot2[0].after);
      expect(proven.slot2[0].proveItPart).toBe(0);
    }
  });

  it("applies near the edge of the band of even Matches", () => {
    const winners: [DoublesPlayerInput, DoublesPlayerInput] = [
      at(1650),
      at(1650),
    ];
    const proven = play(at(1500, { proveIt: true }), { winners });
    expect(proven.slot2[0].proveItPart).toBeLessThan(0);
  });

  it("reads the pair's shared expected score, not the player's own gap", () => {
    const partner = at(1750);
    const plain = play(at(1250), { partner });
    const proven = play(at(1250, { proveIt: true }), { partner });
    expect(moveOf(proven.slot2[0])).toBeCloseTo(
      moveOf(plain.slot2[0]) * 1.5,
      8,
    );
  });

  it("adds nothing for a player it does not cover", () => {
    const plain = play(at(1500));
    const uncovered = play(at(1500, { proveIt: false }));
    expect(uncovered).toEqual(plain);
  });

  it("takes the larger of its factor and Reliability's, never the product, and the two parts add up", () => {
    const plain = play(at(1500));
    const plainLoss = moveOf(plain.slot2[0]);

    const lowReliability = play(at(1500, { proveIt: true, lossFactor: 1.2 }));
    const covered = lowReliability.slot2[0];
    expect(moveOf(covered)).toBeCloseTo(plainLoss * 1.5, 8);
    expect(covered.reliabilityPart).toBeCloseTo(plainLoss * 0.2, 8);
    expect(covered.proveItPart).toBeCloseTo(plainLoss * 0.3, 8);
    expect(covered.reliabilityPart + covered.proveItPart).toBeCloseTo(
      plainLoss * 0.5,
      8,
    );

    const noReliability = play(at(1500, { proveIt: true, lossFactor: 1.5 }));
    expect(moveOf(noReliability.slot2[0])).toBeCloseTo(plainLoss * 1.5, 8);
    expect(noReliability.slot2[0].proveItPart).toBe(0);
    expect(noReliability.slot2[0].reliabilityPart).toBeCloseTo(
      plainLoss * 0.5,
      8,
    );
  });

  it("scales with the Game's weight", () => {
    const plain = play(at(1500), { weight: 0.5 });
    const proven = play(at(1500, { proveIt: true }), { weight: 0.5 });
    expect(moveOf(proven.slot2[0])).toBeCloseTo(
      moveOf(plain.slot2[0]) * 1.5,
      8,
    );
  });
});
