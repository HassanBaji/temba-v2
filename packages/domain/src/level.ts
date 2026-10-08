import {
  LEVEL_BANDS,
  type LevelBand,
  type SelfDeclareChoice,
} from "./level-bands";

export {
  LEVEL_BANDS,
  SELF_DECLARE_CHOICES,
  type LevelBand,
  type SelfDeclareChoice,
} from "./level-bands";

export const INITIAL_MU = 1500;
export const INITIAL_PHI = 350;
export const INITIAL_SIGMA = 0.06;
export const PROVISIONAL_PHI_THRESHOLD = 200;
/** φ ceiling a Level override writes; below the Provisional threshold so idle growth cannot undo it. */
export const LEVEL_OVERRIDE_PHI = 150;
/** Typical Rated Matches from a fresh Rating (φ₀) until Provisional clears. */
export const RATED_MATCHES_TO_CONFIRM = 5;

/** Band midpoints (continuous Level) for a self-declared Level band. */
export const BAND_MIDPOINTS: Record<LevelBand, number> = {
  D3: 0.35,
  D2: 1.05,
  D1: 1.75,
  C3: 2.45,
  C2: 3.15,
  C1: 3.85,
  B3: 4.55,
  B2: 5.25,
  B1: 5.95,
  A: 6.65,
};

const BAND_MIDPOINT_HUNDREDTHS: Record<LevelBand, number> = {
  D3: 35,
  D2: 105,
  D1: 175,
  C3: 245,
  C2: 315,
  C1: 385,
  B3: 455,
  B2: 525,
  B1: 595,
  A: 665,
};

export type RatingGlickoState = {
  mu: number;
  phi: number;
  sigma: number;
  levelBand: LevelBand;
};

export type YouRatingView = {
  level: string;
  levelBand: LevelBand;
  provisional: boolean;
  /** Typical Rated Matches still needed before Provisional clears. 0 when settled. */
  ratedMatchesRemaining: number;
};

export function clampLevel(level: number): number {
  return Math.min(7, Math.max(0, level));
}

export function muFromLevel(level: number): number {
  return INITIAL_MU + (level - 3) * 500;
}

export function muFromBand(band: LevelBand): number {
  return INITIAL_MU + (BAND_MIDPOINT_HUNDREDTHS[band] - 300) * 5;
}

export function levelFromMu(mu: number): number {
  return clampLevel(3 + (mu - INITIAL_MU) / 500);
}

export function formatLevel(level: number): string {
  const tenths = Math.round(clampLevel(level) * 10 + 1e-8);
  const clampedTenths = Math.min(70, Math.max(0, tenths));
  return (clampedTenths / 10).toFixed(1);
}

export function displayedLevelFromMu(mu: number): string {
  return formatLevel(levelFromMu(mu));
}

export function bandFromLevel(level: number): LevelBand {
  const clamped = clampLevel(level);
  for (let index = LEVEL_BANDS.length - 1; index > 0; index--) {
    const band = LEVEL_BANDS[index];
    if (band && clamped >= BAND_LOWER_HUNDREDTHS[band] / 100) {
      return band;
    }
  }
  return "D3";
}

/** Equal-width 0.7 bands as hundredths of Level (D3 0.0–0.7 … A 6.3–7.0). */
export const BAND_LOWER_HUNDREDTHS: Record<LevelBand, number> = {
  D3: 0,
  D2: 70,
  D1: 140,
  C3: 210,
  C2: 280,
  C1: 350,
  B3: 420,
  B2: 490,
  B1: 560,
  A: 630,
};

export const BAND_UPPER_HUNDREDTHS: Record<LevelBand, number> = {
  D3: 70,
  D2: 140,
  D1: 210,
  C3: 280,
  C2: 350,
  C1: 420,
  B3: 490,
  B2: 560,
  B1: 630,
  A: 700,
};

export type ProgressToNextBand = {
  /** Integer 0–100 within the current band toward its upper boundary. */
  progressPercent: number;
  /** Next Level band above the current one, or null at top band `A`. */
  nextBand: LevelBand | null;
};

/**
 * Progress within the stored/current Level band toward the next band’s lower
 * boundary (current band upper). Uses the equal-width 0.7 product table.
 * Top band `A` is always maxed with no next band.
 */
export function progressToNextBand(
  level: number,
  levelBand: LevelBand,
): ProgressToNextBand {
  const bandIndex = LEVEL_BANDS.indexOf(levelBand);
  const nextBand =
    bandIndex >= 0 && bandIndex < LEVEL_BANDS.length - 1
      ? (LEVEL_BANDS[bandIndex + 1] ?? null)
      : null;

  if (nextBand === null) {
    return { progressPercent: 100, nextBand: null };
  }

  const lower = BAND_LOWER_HUNDREDTHS[levelBand];
  const upper = BAND_UPPER_HUNDREDTHS[levelBand];
  const span = upper - lower;
  if (span <= 0) {
    return { progressPercent: 100, nextBand };
  }

  const hundredths = levelToHundredths(level);
  const raw = ((hundredths - lower) / span) * 100;
  const progressPercent = Math.min(100, Math.max(0, Math.round(raw)));

  return { progressPercent, nextBand };
}

const HYSTERESIS_HUNDREDTHS = 10;

function levelToHundredths(level: number): number {
  return Math.round(clampLevel(level) * 100 + 1e-8);
}

/**
 * Keep the stored Level band until continuous Level crosses the neighbouring
 * boundary by +0.10 (up) or −0.10 (down). Then take the new band from the
 * strict table (may skip intermediate labels on a large jump).
 */
export function bandWithHysteresis(
  level: number,
  storedBand: LevelBand,
): LevelBand {
  const strict = bandFromLevel(level);
  if (strict === storedBand) {
    return storedBand;
  }

  const hundredths = levelToHundredths(level);
  const storedIndex = LEVEL_BANDS.indexOf(storedBand);
  const strictIndex = LEVEL_BANDS.indexOf(strict);

  if (strictIndex > storedIndex) {
    if (
      hundredths >=
      BAND_UPPER_HUNDREDTHS[storedBand] + HYSTERESIS_HUNDREDTHS
    ) {
      return strict;
    }
    return storedBand;
  }

  if (hundredths <= BAND_LOWER_HUNDREDTHS[storedBand] - HYSTERESIS_HUNDREDTHS) {
    return strict;
  }
  return storedBand;
}

export function isProvisional(phi: number): boolean {
  return phi > PROVISIONAL_PHI_THRESHOLD;
}

/**
 * Product-facing count of typical Rated Matches until φ is at or below the
 * Provisional threshold. Linear in φ between φ₀ and the threshold; never
 * exposes raw φ. Still-Provisional Ratings always return at least 1.
 */
export function ratedMatchesRemainingToConfirm(phi: number): number {
  if (!isProvisional(phi)) {
    return 0;
  }

  const span = INITIAL_PHI - PROVISIONAL_PHI_THRESHOLD;
  const cappedPhi = Math.min(phi, INITIAL_PHI);
  const remaining = Math.ceil(
    ((cappedPhi - PROVISIONAL_PHI_THRESHOLD) / span) * RATED_MATCHES_TO_CONFIRM,
  );
  return Math.max(1, remaining);
}

export function confirmedPhiForOverride(phi: number | null): number {
  return Math.min(phi ?? INITIAL_PHI, LEVEL_OVERRIDE_PHI);
}

export function initialRatingFromChoice(
  choice: SelfDeclareChoice,
): RatingGlickoState {
  if (choice === "unknown") {
    return {
      mu: INITIAL_MU,
      phi: INITIAL_PHI,
      sigma: INITIAL_SIGMA,
      levelBand: "C2",
    };
  }

  return {
    mu: muFromBand(choice),
    phi: INITIAL_PHI,
    sigma: INITIAL_SIGMA,
    levelBand: choice,
  };
}

export function youRatingViewFromState(
  state: Pick<RatingGlickoState, "mu" | "phi" | "levelBand">,
): YouRatingView {
  return {
    level: displayedLevelFromMu(state.mu),
    levelBand: state.levelBand,
    provisional: isProvisional(state.phi),
    ratedMatchesRemaining: ratedMatchesRemainingToConfirm(state.phi),
  };
}
