import {
  INITIAL_PHI,
  bandFromLevel,
  initialRatingFromChoice,
  levelFromMu,
  type RatingGlickoState,
} from "./level";

/**
 * φ floor for a first Group Level (ADR-0053): Provisional, so about two
 * Group Matches confirm it, but steadier than a fresh Temba Rating.
 */
export const GROUP_RATING_START_PHI = 250;

/** A first Group Level: the Temba Rating's μ and σ, Provisional. */
export function groupRatingStart(
  temba: Pick<RatingGlickoState, "mu" | "phi" | "sigma"> | null,
): RatingGlickoState {
  const base = temba ?? initialRatingFromChoice("unknown");
  return {
    mu: base.mu,
    phi: Math.min(INITIAL_PHI, Math.max(base.phi, GROUP_RATING_START_PHI)),
    sigma: base.sigma,
    levelBand: bandFromLevel(levelFromMu(base.mu)),
  };
}
