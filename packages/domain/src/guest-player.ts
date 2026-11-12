import {
  bandFromLevel,
  LEVEL_BANDS,
  levelFromMu,
  type LevelBand,
  type RatingGlickoState,
} from "./level";

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
 * The Level band a Guest player shows and is balanced at: the mean band of
 * the other players in the Game who have one. Null when none do.
 */
export function guestStandInBand(
  bands: readonly (LevelBand | null)[],
): LevelBand | null {
  const known = bands.filter((band): band is LevelBand => band != null);
  if (known.length === 0) {
    return null;
  }
  const mean =
    known.reduce((sum, band) => sum + LEVEL_BANDS.indexOf(band), 0) /
    known.length;
  return LEVEL_BANDS[Math.round(mean)] ?? null;
}
