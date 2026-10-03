import {
  glicko2EmptyPeriod,
  type ClassicGlicko,
} from "~/server/ratings/glicko2";
import {
  INITIAL_PHI,
  youRatingViewFromState,
  type LevelBand,
  type YouRatingView,
} from "~/server/ratings/level";

/** One empty Glicko-2 period per 30 idle days since lastRatedAt. */
export const IDLE_PERIOD_DAYS = 30;

/** Idle days are elapsed 24-hour periods, not calendar midnights. */
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const IDLE_PERIOD_MS = IDLE_PERIOD_DAYS * MS_PER_DAY;

/**
 * Whole empty periods since the last Rated Match: floor(elapsed 24h days / 30).
 * Users who have never had a Rated Match (`lastRatedAt` null) get 0 — no extra
 * growth from selfDeclaredAt or createdAt.
 */
export function idleEmptyPeriodCount(
  lastRatedAt: Date | null | undefined,
  now: Date,
): number {
  if (!lastRatedAt) {
    return 0;
  }

  const elapsedMs = now.getTime() - lastRatedAt.getTime();
  if (elapsedMs < IDLE_PERIOD_MS) {
    return 0;
  }

  return Math.floor(elapsedMs / IDLE_PERIOD_MS);
}

/**
 * Apply Glicko-2 empty-period φ growth for each idle period, capped at φ₀ = 350.
 * μ and σ are unchanged. No-ops when `lastRatedAt` is null.
 */
export function applyIdleInflation(
  rating: ClassicGlicko,
  lastRatedAt: Date | null | undefined,
  now: Date,
): ClassicGlicko {
  const periods = idleEmptyPeriodCount(lastRatedAt, now);
  let result = rating;

  for (let i = 0; i < periods; i++) {
    if (result.phi >= INITIAL_PHI) {
      return { ...result, phi: INITIAL_PHI };
    }
    const next = glicko2EmptyPeriod(result);
    result = {
      ...next,
      phi: Math.min(next.phi, INITIAL_PHI),
    };
  }

  return result;
}

export function youRatingViewAfterIdle(
  row: {
    mu: number;
    phi: number;
    sigma: number;
    levelBand: LevelBand;
    lastRatedAt: Date | null;
  },
  now: Date,
): YouRatingView {
  const inflated = applyIdleInflation(
    { mu: row.mu, phi: row.phi, sigma: row.sigma },
    row.lastRatedAt,
    now,
  );
  return youRatingViewFromState({
    mu: inflated.mu,
    phi: inflated.phi,
    levelBand: row.levelBand,
  });
}
