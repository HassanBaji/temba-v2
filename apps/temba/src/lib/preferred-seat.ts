import {
  vacantJoinSeats,
  type FriendlyGameJoinSeat,
} from "~/lib/friendly-game-cta";
import { isPreferredPosition } from "~/lib/preferred-position";

/**
 * Which Position the Friendly Game join sheet opens with already picked,
 * given the caller's Preferred Position and which Positions are still free.
 *
 * Preferred Position is a **default, not a rule**: this only decides the
 * opening selection. Nothing here submits, hides, or refuses anything — the
 * sheet still draws both Positions, the pick is still overridable with one
 * tap, and joining still needs the footer button.
 *
 * The answer is `null` — today's behaviour, an empty picker — whenever:
 * - the Preferred Position is `either` (a real answer, and the answer is
 *   "no side"),
 * - it is unanswered (null; also what `users.onboardingState` reads for a
 *   User who is still `provisioning`), or
 * - no free Position matches it, because every matching Position is taken.
 *
 * When several free Positions match — both Game teams still have their left
 * open, say — the first in the order the sheet draws them wins. The spec
 * frames this as "that Position is free on the chosen side"; the sheet has no
 * chosen side until a tap, so the first matching free Position is the one
 * offered, and picking another is a single tap away.
 */
export function preferredJoinSeat(
  sides: readonly {
    sideIndex: number;
    left: unknown;
    right: unknown;
  }[],
  preferredPosition: string | null | undefined,
): FriendlyGameJoinSeat | null {
  if (
    !isPreferredPosition(preferredPosition) ||
    preferredPosition === "either"
  ) {
    return null;
  }

  return (
    vacantJoinSeats(sides).find(
      (seat) => seat.position === preferredPosition,
    ) ?? null
  );
}
