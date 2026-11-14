import { describe, expect, it } from "vitest";

import { IDLE_PERIOD_MS } from "./idle";
import {
  rateDoublesMatch,
  type DoublesPlayerInput,
} from "./rate-doubles-match";
import {
  KING_PLACE_WINS,
  kingField,
  kingFieldPlayer,
  kingPlaceWins,
  rateKingPlace,
} from "./rate-king-place";

const now = new Date("2026-06-01T12:00:00Z");

function player(mu: number, phi = 200): DoublesPlayerInput {
  return {
    state: { mu, phi, sigma: 0.06, levelBand: "C2" },
    lastRatedAt: now,
  };
}

const pair: [DoublesPlayerInput, DoublesPlayerInput] = [
  player(1500),
  player(1500),
];
const field = { mu: 1500, phi: 200 };

function gain(wins: number, against = field, placed = pair) {
  const [first] = rateKingPlace({ pair: placed, field: against, wins, now });
  return first.after.mu - first.before.mu;
}

describe("kingPlaceWins", () => {
  it("counts first to fourth place as 2, 1, a half and a quarter of a win", () => {
    expect([1, 2, 3, 4].map(kingPlaceWins)).toEqual([...KING_PLACE_WINS]);
    expect(KING_PLACE_WINS).toEqual([2, 1, 0.5, 0.25]);
  });

  it("counts nothing below fourth or without a place", () => {
    expect(kingPlaceWins(5)).toBe(0);
    expect(kingPlaceWins(0)).toBe(0);
    expect(kingPlaceWins(null)).toBe(0);
  });
});

describe("kingField", () => {
  it("is the mean μ and φ of everyone on a court", () => {
    expect(kingField([player(1400, 100), player(1800, 300)], now)).toEqual({
      mu: 1600,
      phi: 200,
    });
  });

  it("is null with nobody on a court", () => {
    expect(kingField([], now)).toBeNull();
  });

  it("reads an idle player's φ after idle inflation", () => {
    const idle = {
      ...player(1500, 100),
      lastRatedAt: new Date(now.getTime() - 6 * IDLE_PERIOD_MS),
    };
    expect(kingField([idle], now)?.phi).toBeGreaterThan(100);
  });
});

describe("rateKingPlace", () => {
  it("moves one win exactly as a won Rated Match against the field", () => {
    const opponent = kingFieldPlayer(field);
    const match = rateDoublesMatch({
      slot1: pair,
      slot2: [opponent, opponent],
      outcome: "slot1",
      weight: 1,
      now,
    }).slot1[0];
    const [first] = rateKingPlace({ pair, field, wins: 1, now });

    expect(first.after).toEqual(match.after);
    expect(first.levelBand).toBe(match.levelBand);
  });

  it("gives each place less than the one above it", () => {
    const gains = KING_PLACE_WINS.map((wins) => gain(wins));

    expect(gains.every((value) => value > 0)).toBe(true);
    expect(gains).toEqual([...gains].sort((a, b) => b - a));
    expect(new Set(gains).size).toBe(4);
  });

  it("blends a part of a win by that part", () => {
    expect(gain(0.5)).toBeCloseTo(gain(1) / 2, 9);
    expect(gain(0.25)).toBeCloseTo(gain(1) / 4, 9);
  });

  it("takes two wins one after the other", () => {
    const [once] = rateKingPlace({ pair, field, wins: 1, now });
    const [again] = rateKingPlace({
      pair: [
        {
          state: { ...once.after, levelBand: once.levelBand },
          lastRatedAt: now,
        },
        {
          state: { ...once.after, levelBand: once.levelBand },
          lastRatedAt: now,
        },
      ],
      field,
      wins: 1,
      now,
    });
    const [twice] = rateKingPlace({ pair, field, wins: 2, now });

    expect(twice.after.mu).toBeCloseTo(again.after.mu, 9);
    expect(twice.before).toEqual(once.before);
  });

  it("gains more against a stronger field and less against a weaker one", () => {
    expect(gain(1, { mu: 1800, phi: 200 })).toBeGreaterThan(gain(1));
    expect(gain(1, { mu: 1200, phi: 200 })).toBeLessThan(gain(1));
    expect(gain(1, { mu: 1200, phi: 200 })).toBeGreaterThan(0);
  });

  it("moves a Provisional player further than a confirmed partner", () => {
    const [provisional, confirmed] = rateKingPlace({
      pair: [player(1500, 350), player(1500, 120)],
      field,
      wins: 1,
      now,
    });

    expect(provisional.after.mu - provisional.before.mu).toBeGreaterThan(
      confirmed.after.mu - confirmed.before.mu,
    );
  });

  it("gives the weaker player of a pair less than the stronger partner", () => {
    const [strong, weak] = rateKingPlace({
      pair: [player(1700), player(1300)],
      field,
      wins: 1,
      now,
    });

    expect(weak.after.mu - weak.before.mu).toBeLessThan(
      strong.after.mu - strong.before.mu,
    );
  });

  it("moves nothing for no wins", () => {
    const [first, second] = rateKingPlace({ pair, field, wins: 0, now });

    expect(first.after.mu).toBe(pair[0].state.mu);
    expect(second.after.phi).toBe(pair[1].state.phi);
  });
});
