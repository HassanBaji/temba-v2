export const INITIAL_MU = 1500;
export const INITIAL_PHI = 350;
export const INITIAL_SIGMA = 0.06;
export const PROVISIONAL_PHI_THRESHOLD = 200;

export const LEVEL_BANDS = [
  "D3",
  "D2",
  "D1",
  "C3",
  "C2",
  "C1",
  "B3",
  "B2",
  "B1",
  "A",
] as const;

export type LevelBand = (typeof LEVEL_BANDS)[number];

export type SelfDeclareChoice = LevelBand | "unknown";

export const SELF_DECLARE_CHOICES = [...LEVEL_BANDS, "unknown"] as const;

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
  if (clamped >= 6.3) {
    return "A";
  }
  if (clamped >= 5.6) {
    return "B1";
  }
  if (clamped >= 4.9) {
    return "B2";
  }
  if (clamped >= 4.2) {
    return "B3";
  }
  if (clamped >= 3.5) {
    return "C1";
  }
  if (clamped >= 2.8) {
    return "C2";
  }
  if (clamped >= 2.1) {
    return "C3";
  }
  if (clamped >= 1.4) {
    return "D1";
  }
  if (clamped >= 0.7) {
    return "D2";
  }
  return "D3";
}

/** Equal-width 0.7 bands as hundredths of Level, for hysteresis comparisons. */
const BAND_LOWER_HUNDREDTHS: Record<LevelBand, number> = {
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

const BAND_UPPER_HUNDREDTHS: Record<LevelBand, number> = {
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
  };
}
