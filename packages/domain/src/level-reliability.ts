/**
 * Reliability (ADR-0095): how far the people a player plays with agree that
 * their Level fits how they play, 0 to 100 per sport. Performance ratings on
 * Matches that count for Temba Level move it; below 100 a lost Match costs
 * more. The constants are starting values and tunable.
 */

export const FULL_RELIABILITY = 100;
export const MIN_RELIABILITY = 0;
/** A settled rating below this lowers Reliability. */
export const RELIABILITY_LOW_RATING = 5;
/** A settled rating from this up, an ordinary game, restores it. */
export const RELIABILITY_STEADY_RATING = 6;
/** What a settled rating of 1 takes; ratings between 1 and 5 take a share. */
export const RELIABILITY_MAX_DROP = 20;
export const RELIABILITY_RECOVERY = 5;
export const RELIABILITY_PROVISIONAL_FACTOR = 2;
/** How much more a lost Match costs at no Reliability at all. */
export const RELIABILITY_MAX_LOSS_FACTOR = 1.5;

const LOWEST_RATING = 1;

/**
 * What one Match's settled Performance rating does to Reliability: nothing
 * between 5 and 6, a drop below 5 that grows to 20 at a rating of 1, and 5
 * back from 6 up. A Provisional player moves twice as far either way.
 */
export function reliabilityStep(
  rating: number,
  options: { provisional: boolean },
): number {
  const factor = options.provisional ? RELIABILITY_PROVISIONAL_FACTOR : 1;
  if (rating >= RELIABILITY_STEADY_RATING) {
    return factor * RELIABILITY_RECOVERY;
  }
  if (rating >= RELIABILITY_LOW_RATING) {
    return 0;
  }
  const shortfall =
    (RELIABILITY_LOW_RATING - Math.max(rating, LOWEST_RATING)) /
    (RELIABILITY_LOW_RATING - LOWEST_RATING);
  return -factor * RELIABILITY_MAX_DROP * shortfall;
}

export function clampReliability(reliability: number): number {
  return Math.min(FULL_RELIABILITY, Math.max(MIN_RELIABILITY, reliability));
}

/** How many times further a lost Match moves a Level: 1 at 100, 1.5 at 0. */
export function reliabilityLossFactor(reliability: number): number {
  return (
    1 +
    ((RELIABILITY_MAX_LOSS_FACTOR - 1) *
      (FULL_RELIABILITY - clampReliability(reliability))) /
      FULL_RELIABILITY
  );
}

/** `85%`, a whole number. */
export function formatReliability(reliability: number): string {
  return `${Math.round(clampReliability(reliability))}%`;
}

/** A signed whole-number change: "+5", "−10", "0". */
export function formatReliabilityDelta(delta: number): string {
  const rounded = Math.round(delta);
  if (rounded > 0) {
    return `+${rounded}`;
  }
  if (rounded < 0) {
    return `−${-rounded}`;
  }
  return "0";
}

/** How much more a loss costs at this Reliability, as a whole percent: 15 at 70. */
export function reliabilityLossExtraPercent(reliability: number): number {
  return Math.round((reliabilityLossFactor(reliability) - 1) * 100);
}
