import { describe, expect, it } from "vitest";

import { glicko2EmptyPeriod, glicko2Period, glicko2Step } from "./glicko2";

describe("glicko2Period", () => {
  it("matches Glickman's worked example over three opponents", () => {
    const result = glicko2Period({ mu: 1500, phi: 200, sigma: 0.06 }, [
      { mu: 1400, phi: 30, score: 1 },
      { mu: 1550, phi: 100, score: 0 },
      { mu: 1700, phi: 300, score: 0 },
    ]);

    expect(result.mu).toBeCloseTo(1464.06, 1);
    expect(result.phi).toBeCloseTo(151.52, 1);
    expect(result.sigma).toBeCloseTo(0.05999, 4);
  });
});

describe("glicko2Step", () => {
  it("equals a period against the same single opponent", () => {
    const player = { mu: 1500, phi: 200, sigma: 0.06 };
    const opponent = { mu: 1400, phi: 30 };
    expect(glicko2Step(player, opponent, 1)).toEqual(
      glicko2Period(player, [{ ...opponent, score: 1 }]),
    );
  });

  it("raises μ on a win and lowers it on a loss", () => {
    const player = { mu: 1500, phi: 200, sigma: 0.06 };
    const opponent = { mu: 1500, phi: 200 };
    expect(glicko2Step(player, opponent, 1).mu).toBeGreaterThan(1500);
    expect(glicko2Step(player, opponent, 0).mu).toBeLessThan(1500);
  });

  it("shrinks φ after a result", () => {
    const player = { mu: 1500, phi: 200, sigma: 0.06 };
    expect(glicko2Step(player, { mu: 1500, phi: 200 }, 0.5).phi).toBeLessThan(
      200,
    );
  });
});

describe("glicko2EmptyPeriod", () => {
  it("grows φ and leaves μ and σ unchanged", () => {
    const result = glicko2EmptyPeriod({ mu: 1500, phi: 200, sigma: 0.06 });
    expect(result.mu).toBeCloseTo(1500, 8);
    expect(result.sigma).toBe(0.06);
    expect(result.phi).toBeGreaterThan(200);
  });
});
