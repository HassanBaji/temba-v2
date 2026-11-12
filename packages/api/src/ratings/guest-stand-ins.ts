import {
  bandFromLevel,
  levelFromMu,
  type RatingGlickoState,
} from "@repo/domain/level";

/**
 * The Rating a Guest player plays a Rated Match at: the mean of the Users
 * with an account in that Match, so a guest neither lifts nor drags the
 * others' expectation (ADR-0079). Null when nobody in the Match has one.
 */
export function guestStandInState(
  players: readonly RatingGlickoState[],
): RatingGlickoState | null {
  if (players.length === 0) {
    return null;
  }
  const mean = (pick: (state: RatingGlickoState) => number) =>
    players.reduce((sum, state) => sum + pick(state), 0) / players.length;
  const mu = mean((state) => state.mu);
  return {
    mu,
    phi: mean((state) => state.phi),
    sigma: mean((state) => state.sigma),
    levelBand: bandFromLevel(levelFromMu(mu)),
  };
}

/**
 * Every seat's input for `rateDoublesMatch`, with each Guest player standing
 * in at the mean of the other players' states (ADR-0079).
 */
export function withGuestStandIns<T extends { state: RatingGlickoState }>(
  userIds: readonly string[],
  guestIds: ReadonlySet<string>,
  inputOf: (userId: string) => T,
): (userId: string) => T | { state: RatingGlickoState; lastRatedAt: null } {
  const standIn = guestStandInState(
    userIds
      .filter((userId) => !guestIds.has(userId))
      .map((userId) => inputOf(userId).state),
  );
  return (userId) =>
    guestIds.has(userId) && standIn
      ? { state: standIn, lastRatedAt: null }
      : inputOf(userId);
}
