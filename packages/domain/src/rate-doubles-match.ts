import {
  glicko2Step,
  type ClassicGlicko,
  type ClassicGlickoOpponent,
} from "./glicko2";
import { applyIdleInflation } from "./idle";
import {
  bandWithHysteresis,
  levelFromMu,
  type LevelBand,
  type RatingGlickoState,
} from "./level";

export type DoublesOutcome = "slot1" | "slot2" | "draw";

export type DoublesPlayerInput = {
  state: RatingGlickoState;
  lastRatedAt: Date | null | undefined;
};

export type DoublesPlayerResult = {
  before: RatingGlickoState;
  after: ClassicGlicko;
  score: 0 | 0.5 | 1;
  levelBand: LevelBand;
};

type Pair<T> = [T, T];

export type RateDoublesMatchInput = {
  slot1: Pair<DoublesPlayerInput>;
  slot2: Pair<DoublesPlayerInput>;
  outcome: DoublesOutcome;
  weight: number;
  now: Date;
};

export type RateDoublesMatchResult = {
  slot1: Pair<DoublesPlayerResult>;
  slot2: Pair<DoublesPlayerResult>;
};

function scoreForSlot(
  outcome: DoublesOutcome,
  slot: "slot1" | "slot2",
): 0 | 0.5 | 1 {
  if (outcome === "draw") {
    return 0.5;
  }
  return outcome === slot ? 1 : 0;
}

function compositeOpponent(
  first: RatingGlickoState,
  second: RatingGlickoState,
): ClassicGlickoOpponent {
  return {
    mu: (first.mu + second.mu) / 2,
    phi: (first.phi + second.phi) / 2,
  };
}

function blendWeightedStep(
  before: ClassicGlicko,
  star: ClassicGlicko,
  weight: number,
): ClassicGlicko {
  return {
    mu: before.mu + weight * (star.mu - before.mu),
    phi: before.phi + weight * (star.phi - before.phi),
    sigma: before.sigma + weight * (star.sigma - before.sigma),
  };
}

function inflate(player: DoublesPlayerInput, now: Date): RatingGlickoState {
  const inflated = applyIdleInflation(player.state, player.lastRatedAt, now);
  return {
    mu: inflated.mu,
    phi: inflated.phi,
    sigma: inflated.sigma,
    levelBand: player.state.levelBand,
  };
}

function ratePlayer(
  before: RatingGlickoState,
  opponent: ClassicGlickoOpponent,
  score: 0 | 0.5 | 1,
  weight: number,
): DoublesPlayerResult {
  const star = glicko2Step(before, opponent, score);
  const after = blendWeightedStep(before, star, weight);
  return {
    before,
    after,
    score,
    levelBand: bandWithHysteresis(levelFromMu(after.mu), before.levelBand),
  };
}

/**
 * Each player faces the opposing pair as one composite opponent, steps once in
 * Glicko-2, and the step is blended by `weight`. Idle RD inflation runs per
 * player before composites are built.
 */
export function rateDoublesMatch(
  input: RateDoublesMatchInput,
): RateDoublesMatchResult {
  const { outcome, weight, now } = input;
  const slot1 = input.slot1.map((player) =>
    inflate(player, now),
  ) as Pair<RatingGlickoState>;
  const slot2 = input.slot2.map((player) =>
    inflate(player, now),
  ) as Pair<RatingGlickoState>;
  const slot1Composite = compositeOpponent(slot1[0], slot1[1]);
  const slot2Composite = compositeOpponent(slot2[0], slot2[1]);
  const slot1Score = scoreForSlot(outcome, "slot1");
  const slot2Score = scoreForSlot(outcome, "slot2");

  return {
    slot1: [
      ratePlayer(slot1[0], slot2Composite, slot1Score, weight),
      ratePlayer(slot1[1], slot2Composite, slot1Score, weight),
    ],
    slot2: [
      ratePlayer(slot2[0], slot1Composite, slot2Score, weight),
      ratePlayer(slot2[1], slot1Composite, slot2Score, weight),
    ],
  };
}
