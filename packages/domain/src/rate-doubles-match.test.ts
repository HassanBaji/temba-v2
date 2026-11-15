import { describe, expect, it } from "vitest";

import { glicko2Step } from "./glicko2";
import { IDLE_PERIOD_MS } from "./idle";
import { bandWithHysteresis, levelFromMu } from "./level";
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
