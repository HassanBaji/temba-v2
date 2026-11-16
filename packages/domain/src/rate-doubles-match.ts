import {
  classicExpectedScore,
  glicko2Step,
  type ClassicGlicko,
  type ClassicGlickoOpponent,
} from "./glicko2";
import { applyIdleInflation } from "./idle";
import {
  bandWithHysteresis,
  expectedScoreWithinProveIt,
  levelFromMu,
  PROVE_IT_LOSS_FACTOR,
  type LevelBand,
  type RatingGlickoState,
} from "./level";

export type DoublesOutcome = "slot1" | "slot2" | "draw";

export type DoublesPlayerInput = {
  state: RatingGlickoState;
  lastRatedAt: Date | null | undefined;
  /**
   * How many times further a lost Match moves this player's μ, from their
   * Reliability (ADR-0095). 1 when left out.
   */
  lossFactor?: number;
  /**
   * Whether the Prove-it rule covers this player (ADR-0097): a lost Match
   * against a pair at about their level then moves them at least
   * `PROVE_IT_LOSS_FACTOR` times as far.
   */
  proveIt?: boolean;
};

export type DoublesPlayerResult = {
  before: RatingGlickoState;
  after: ClassicGlicko;
  score: 0 | 0.5 | 1;
  levelBand: LevelBand;
  /** The share of the μ move that low Reliability added to a loss; 0 or below. */
  reliabilityPart: number;
  /**
   * The share of the μ move the Prove-it rule added to a loss beyond what
   * Reliability did; 0 or below. With `reliabilityPart` it makes up the
   * whole extra, never more than the larger factor alone.
   */
  proveItPart: number;
};

type Pair<T> = [T, T];

/**
 * How much of the gap to a partner shifts a player's opponent (ADR-0070). At 1
 * both partners share the pair-against-pair expectation; at 0 the partner is
 * ignored, as under ADR-0009.
 */
export const DOUBLES_PARTNER_WEIGHT = 1;

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

function partnerWeightedOpponent(
  opposingPair: ClassicGlickoOpponent,
  own: RatingGlickoState,
  partner: RatingGlickoState,
): ClassicGlickoOpponent {
  return {
    mu: opposingPair.mu - (DOUBLES_PARTNER_WEIGHT * (partner.mu - own.mu)) / 2,
    phi: opposingPair.phi,
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
  lossFactor: number,
  proveIt: boolean,
): DoublesPlayerResult {
  const star = glicko2Step(before, opponent, score);
  const stepped = blendWeightedStep(before, star, weight);
  const step = stepped.mu - before.mu;
  const reliabilityPart = score === 0 ? (lossFactor - 1) * step : 0;
  const proveItFactor =
    score === 0 &&
    proveIt &&
    expectedScoreWithinProveIt(classicExpectedScore(before.mu, opponent))
      ? PROVE_IT_LOSS_FACTOR
      : 1;
  const proveItPart =
    proveItFactor > lossFactor ? (proveItFactor - lossFactor) * step : 0;
  const after = { ...stepped, mu: stepped.mu + reliabilityPart + proveItPart };
  return {
    before,
    after,
    score,
    levelBand: bandWithHysteresis(levelFromMu(after.mu), before.levelBand),
    reliabilityPart,
    proveItPart,
  };
}

/**
 * Each player faces the opposing pair as one composite opponent, shifted by
 * half the gap to their partner so the pair shares one expected score, steps
 * once in Glicko-2 by their own φ, and the step is blended by `weight`. Idle
 * RD inflation runs per player before composites are built. A player who
 * lost moves `lossFactor` times as far, or `PROVE_IT_LOSS_FACTOR` times
 * when the Prove-it rule covers them and that is larger (ADR-0097).
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
  const lossFactorOf = (player: DoublesPlayerInput) =>
    Math.max(1, player.lossFactor ?? 1);

  return {
    slot1: [
      ratePlayer(
        slot1[0],
        partnerWeightedOpponent(slot2Composite, slot1[0], slot1[1]),
        slot1Score,
        weight,
        lossFactorOf(input.slot1[0]),
        input.slot1[0].proveIt ?? false,
      ),
      ratePlayer(
        slot1[1],
        partnerWeightedOpponent(slot2Composite, slot1[1], slot1[0]),
        slot1Score,
        weight,
        lossFactorOf(input.slot1[1]),
        input.slot1[1].proveIt ?? false,
      ),
    ],
    slot2: [
      ratePlayer(
        slot2[0],
        partnerWeightedOpponent(slot1Composite, slot2[0], slot2[1]),
        slot2Score,
        weight,
        lossFactorOf(input.slot2[0]),
        input.slot2[0].proveIt ?? false,
      ),
      ratePlayer(
        slot2[1],
        partnerWeightedOpponent(slot1Composite, slot2[1], slot2[0]),
        slot2Score,
        weight,
        lossFactorOf(input.slot2[1]),
        input.slot2[1].proveIt ?? false,
      ),
    ],
  };
}
