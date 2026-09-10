/**
 * When the Friendly-game join sheet may offer "Join with a partner"
 * (register-with-partner, TEM-207). The partner path takes both Positions
 * on one fully vacant side; a half-full Game must not grow a dead-end.
 *
 * Every input is already on `games.byId` — do not add a server field for this.
 */

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
