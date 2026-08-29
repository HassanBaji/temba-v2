/**
 * Classic-scale Glicko-2 period update (Glickman).
 *
 * Stored μ/φ are the published Glicko scale (μ₀ = 1500, φ₀ = 350). This module
 * converts to the Glicko-2 scale, runs one period against a single opponent,
 * and converts back. Weight blend and Level mapping stay outside.
 *
 * @see http://www.glicko.net/glicko/glicko2.pdf
 */

export const GLICKO2_SCALE = 173.7178;
export const GLICKO2_TAU = 0.5;
const CONVERGENCE_EPSILON = 0.000001;
const MAX_ILLINOIS_ITERATIONS = 100;
const MAX_VOLATILITY_BRACKET = 10_000;

export type ClassicGlicko = {
  mu: number;
  phi: number;
  sigma: number;
};

export type ClassicGlickoOpponent = {
  mu: number;
  phi: number;
};

type Glicko2Scale = {
  mu: number;
  phi: number;
  sigma: number;
};

function toGlicko2Scale(rating: ClassicGlicko): Glicko2Scale {
  return {
    mu: (rating.mu - 1500) / GLICKO2_SCALE,
    phi: rating.phi / GLICKO2_SCALE,
    sigma: rating.sigma,
  };
}

function fromGlicko2Scale(rating: Glicko2Scale): ClassicGlicko {
  return {
    mu: rating.mu * GLICKO2_SCALE + 1500,
    phi: rating.phi * GLICKO2_SCALE,
    sigma: rating.sigma,
  };
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function expectedScore(
  mu: number,
  opponentMu: number,
  opponentPhi: number,
): number {
  return 1 / (1 + Math.exp(-g(opponentPhi) * (mu - opponentMu)));
}

function newSigma(
  phi: number,
  sigma: number,
  v: number,
  delta: number,
): number {
  const a = Math.log(sigma * sigma);
  const tau = GLICKO2_TAU;
  const phiSquared = phi * phi;
  const deltaSquared = delta * delta;

  function f(x: number): number {
    const ex = Math.exp(x);
    const num = ex * (deltaSquared - phiSquared - v - ex);
    const den = 2 * (phiSquared + v + ex) ** 2;
    return num / den - (x - a) / (tau * tau);
  }

  let A = a;
  let B: number;
  if (deltaSquared > phiSquared + v) {
    B = Math.log(deltaSquared - phiSquared - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0 && k < MAX_VOLATILITY_BRACKET) {
      k += 1;
    }
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);
  let iterations = 0;
  while (
    Math.abs(B - A) > CONVERGENCE_EPSILON &&
    iterations < MAX_ILLINOIS_ITERATIONS
  ) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
    iterations += 1;
  }

  return Math.exp(A / 2);
}

/**
 * One Glicko-2 rating period against a single opponent (the doubles composite).
 * `score` is 1 (win), 0 (loss), or 0.5 (draw).
 */
export function glicko2Step(
  player: ClassicGlicko,
  opponent: ClassicGlickoOpponent,
  score: number,
): ClassicGlicko {
  const p = toGlicko2Scale(player);
  const opponentMu = (opponent.mu - 1500) / GLICKO2_SCALE;
  const opponentPhi = opponent.phi / GLICKO2_SCALE;

  const gPhi = g(opponentPhi);
  const eRaw = expectedScore(p.mu, opponentMu, opponentPhi);
  const e = Math.min(1 - 1e-12, Math.max(1e-12, eRaw));
  const v = 1 / (gPhi * gPhi * e * (1 - e));
  const delta = v * gPhi * (score - e);

  const sigmaPrime = newSigma(p.phi, p.sigma, v, delta);
  const phiStar = Math.sqrt(p.phi * p.phi + sigmaPrime * sigmaPrime);
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muPrime = p.mu + phiPrime * phiPrime * gPhi * (score - e);

  return fromGlicko2Scale({
    mu: muPrime,
    phi: phiPrime,
    sigma: sigmaPrime,
  });
}
