import type { ClassicGlicko } from "./glicko2";
import { applyIdleInflation } from "./idle";
import {
  bandFromLevel,
  INITIAL_SIGMA,
  levelFromMu,
  type LevelBand,
  type RatingGlickoState,
} from "./level";
import {
  rateDoublesMatch,
  type DoublesPlayerInput,
} from "./rate-doubles-match";

/**
 * What each place in a King of the court Final order counts for, first place
 * first: that many wins against the field (ADR-0089). A place below the list
 * moves nothing.
 */
export const KING_PLACE_WINS = [2, 1, 0.5, 0.25] as const;

export function kingPlaceWins(place: number | null | undefined): number {
  return place == null ? 0 : (KING_PLACE_WINS[place - 1] ?? 0);
}

export type KingField = { mu: number; phi: number };

/**
 * The field a Place award is won against: the mean μ and φ of everyone on a
 * court, after idle RD inflation. Null for an empty field.
 */
export function kingField(
  players: readonly DoublesPlayerInput[],
  now: Date,
): KingField | null {
  if (players.length === 0) {
    return null;
  }
  const inflated = players.map((player) =>
    applyIdleInflation(player.state, player.lastRatedAt, now),
  );
  const mean = (pick: (state: ClassicGlicko) => number) =>
    inflated.reduce((sum, state) => sum + pick(state), 0) / inflated.length;
  return { mu: mean((state) => state.mu), phi: mean((state) => state.phi) };
}

/** The field as one player, to stand opposite a placed pair or in for a missing partner. */
export function kingFieldPlayer(field: KingField): DoublesPlayerInput {
  return {
    state: {
      mu: field.mu,
      phi: field.phi,
      sigma: INITIAL_SIGMA,
      levelBand: bandFromLevel(levelFromMu(field.mu)),
    },
    lastRatedAt: null,
  };
}

export type KingPlaceResult = {
  before: RatingGlickoState;
  after: ClassicGlicko;
  levelBand: LevelBand;
};

type Pair<T> = [T, T];

/**
 * Rates a placed pair as `wins` wins against the field, pair against pair as
 * a Rated Match is (ADR-0070). Each whole win is one full step, taken one
 * after the other, and a part of a win is one step blended by that part.
 */
export function rateKingPlace(input: {
  pair: Pair<DoublesPlayerInput>;
  field: KingField;
  wins: number;
  now: Date;
}): Pair<KingPlaceResult> {
  const { now } = input;
  const opponent = kingFieldPlayer(input.field);
  const next = (step: {
    after: ClassicGlicko;
    levelBand: LevelBand;
  }): DoublesPlayerInput => ({
    state: { ...step.after, levelBand: step.levelBand },
    lastRatedAt: now,
  });
  let pair = input.pair;
  let before: Pair<RatingGlickoState> = [pair[0].state, pair[1].state];
  let stepped = false;
  let remaining = input.wins;

  while (remaining > 0) {
    const weight = Math.min(1, remaining);
    remaining -= weight;
    const [first, second] = rateDoublesMatch({
      slot1: pair,
      slot2: [opponent, opponent],
      outcome: "slot1",
      weight,
      now,
    }).slot1;
    if (!stepped) {
      before = [first.before, second.before];
      stepped = true;
    }
    pair = [next(first), next(second)];
  }

  const result = (index: 0 | 1): KingPlaceResult => {
    const { levelBand, ...after } = pair[index].state;
    return { before: before[index], after, levelBand };
  };
  return [result(0), result(1)];
}
