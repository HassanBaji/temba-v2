/**
 * When the Friendly-game join sheet may offer "Join with a partner"
 * (register-with-partner, TEM-207). The partner path takes both Positions
 * on one fully vacant side; a half-full Game must not grow a dead-end.
 *
 * Every input is already on `games.byId` — do not add a server field for this.
 */

/** Game home for this Game. Close and deep-link recovery land here. */
export function friendlyGameHomeHref(gameId: string) {
  return `/dashboard/games/${gameId}`;
}

/** Deep link when the Game no longer offers partner join. */
export const PARTNER_JOIN_UNAVAILABLE_TOAST =
  "This Game is no longer open to join with a partner";

/** In-screen copy when the vacant side fills during Partner registration. */
export const PARTNER_VACANT_SIDE_RACE_MESSAGE =
  "That side was taken while you were registering. Join alone, or pick another partner if a side is still fully open.";

export type FriendlyGamePartnerSides = readonly {
  sideIndex?: number;
  left: unknown;
  right: unknown;
}[];

export type OffersPartnerJoinInput = {
  canRegister: boolean;
  format: string;
  registrationMode: string;
  sides: FriendlyGamePartnerSides;
};

export function hasFullyVacantSide(sides: FriendlyGamePartnerSides): boolean {
  return sides.some((side) => side.left == null && side.right == null);
}

/**
 * After a vacant-side race: stay on Pick a partner when a fully vacant side
 * remains; otherwise leave for Game home instead of dead-ending.
 */
export function partnerVacantSideRaceRecovery(
  sides: FriendlyGamePartnerSides,
): "picker" | "game_home" {
  return hasFullyVacantSide(sides) ? "picker" : "game_home";
}

/** First fully vacant side's `sideIndex`, or `null` when none exist. */
export function firstFullyVacantSideIndex(
  sides: FriendlyGamePartnerSides,
): number | null {
  const side = sides.find((row) => row.left == null && row.right == null);
  return side?.sideIndex ?? null;
}

/**
 * Offer the partner chooser only on an individual Friendly game the viewer
 * may register onto, with at least one fully vacant side. Team-only,
 * Americano, full Games, and viewers who cannot register are all false.
 */
export function offersPartnerJoin(input: OffersPartnerJoinInput): boolean {
  return (
    input.canRegister &&
    input.format === "friendly_game" &&
    input.registrationMode === "individual" &&
    hasFullyVacantSide(input.sides)
  );
}

/**
 * Default caller Position for the Keep/Swap toggle (TEM-209). Preference is
 * a default, never a rule. When both have a side and they differ, both are
 * satisfied; otherwise the viewer's Preferred Position wins, then the
 * partner's, then left.
 */
export function seedPartnerCallerPosition(args: {
  viewerPreferred: string | null | undefined;
  partnerPreferred: "left" | "right" | null | undefined;
}): "left" | "right" {
  const viewer =
    args.viewerPreferred === "left" || args.viewerPreferred === "right"
      ? args.viewerPreferred
      : null;
  const partner =
    args.partnerPreferred === "left" || args.partnerPreferred === "right"
      ? args.partnerPreferred
      : null;

  if (viewer && partner && viewer !== partner) {
    return viewer;
  }
  if (viewer) {
    return viewer;
  }
  if (partner) {
    return partner === "left" ? "right" : "left";
  }
  return "left";
}

/**
 * Name of the User seated beside the viewer on the same side, or `null`
 * when the viewer is not seated or sits alone. The booked-with-a-partner
 * hero (TEM-210) keys off this — "seated next to someone", not "registered
 * as a pair".
 */
export function viewerSidePartnerName(args: {
  viewerUserId: string | null | undefined;
  sides: readonly {
    left: { userId: string; name: string } | null;
    right: { userId: string; name: string } | null;
  }[];
}): string | null {
  if (!args.viewerUserId) {
    return null;
  }
  for (const side of args.sides) {
    if (side.left?.userId === args.viewerUserId) {
      return side.right?.name ?? null;
    }
    if (side.right?.userId === args.viewerUserId) {
      return side.left?.name ?? null;
    }
  }
  return null;
}

/** Race: the vacant side filled while the sheet was open. */
export function isPartnerVacantSideRace(error: {
  message: string;
  data?: { code?: string } | null;
}): boolean {
  const code = error.data?.code;
  if (code === "CONFLICT") {
    return true;
  }
  return (
    error.message.includes("No fully vacant side") ||
    error.message.includes("That side already has a User") ||
    error.message.includes("Not enough seats")
  );
}
