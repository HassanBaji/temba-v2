import {
  bandWithHysteresis,
  levelFromMu,
  type LevelBand,
} from "@repo/domain/level";

/**
 * A Rating with one ledger row's μ move taken off and its Level band read
 * again with hysteresis: how a Place award, a Level check or a reversed Match
 * comes off a Rating that something else has moved since, so that later move
 * is kept.
 */
export function withoutMuMove(
  rating: { mu: number; levelBand: LevelBand },
  move: { muBefore: number; muAfter: number },
): { mu: number; levelBand: LevelBand } {
  const mu = rating.mu - (move.muAfter - move.muBefore);
  return {
    mu,
    levelBand: bandWithHysteresis(levelFromMu(mu), rating.levelBand),
  };
}
