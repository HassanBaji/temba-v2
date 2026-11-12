import { guestStandInState } from "@repo/domain/guest-player";
import type { RatingGlickoState } from "@repo/domain/level";

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
