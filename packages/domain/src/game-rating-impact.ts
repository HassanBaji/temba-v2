import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

export function unratedLabel(locale: Locale) {
  return messagesFor(locale).common.unrated;
}

export function unratedGameLine(locale: Locale) {
  return messagesFor(locale).game.rating.unratedGameLine;
}

export function unratedGroupLine(locale: Locale) {
  return messagesFor(locale).game.rating.unratedGroupLine;
}

export type RatingImpactChangeDirection = "up" | "down" | "flat";

/** Absolute Level change, one decimal, sign-free (the arrow glyph carries sign). */
export function ratingImpactChangeMagnitude(levelChange: number): string {
  return Math.abs(levelChange).toFixed(1);
}

export function ratingImpactChangeDirection(
  levelChange: number,
): RatingImpactChangeDirection {
  if (levelChange > 0) {
    return "up";
  }
  if (levelChange < 0) {
    return "down";
  }
  return "flat";
}

/**
 * Standing-sentence copy for the Final-phase Rating impact block
 * (game-details redesign, TEM-182) — the block that explains why the
 * viewer's Home level card changed after this Match. Reuses the exact
 * Provisional/confirmed phrasing conventions already shipped on Home
 * (`.scratch/home-level-redesign/spec.md` §3.4, `home-level-block.tsx`)
 * rather than inventing new copy:
 * - "about" a remaining-games count, never a hard promise — the count is a
 *   linear estimate in φ that can rise after idle-inflation (ADR-0009), so
 *   promising an exact number is a support thread waiting to happen.
 * - "confirms"/"confirmed", never "locks in".
 *
 * The Level band renders through the shipped display remap (D / D+ / C /
 * … / A, PR #96), not the raw stored band, matching every other Level
 * surface (`home-level-block.tsx`, `game-lineup-section.tsx`).
 */
export function ratingImpactStandingSentence(args: {
  newLevelBand: LevelBand;
  isProvisional: boolean;
  ratedMatchesRemainingToConfirm: number | null;
  locale: Locale;
}): string {
  const m = messagesFor(args.locale).game.rating;
  const bandLabel = displayLabelFromStoredBand(args.newLevelBand);

  if (args.isProvisional) {
    const remaining = Math.max(1, args.ratedMatchesRemainingToConfirm ?? 1);
    return m.stillProvisional(bandLabel, remaining);
  }

  return m.stillConfirmed(bandLabel);
}

export function ratingImpactView(
  ratingImpact: {
    levelChange: number;
    newLevel: number;
    newLevelBand: LevelBand;
    isProvisional: boolean;
    ratedMatchesRemainingToConfirm: number | null;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).game.rating;
  const direction = ratingImpactChangeDirection(ratingImpact.levelChange);
  const magnitude = ratingImpactChangeMagnitude(ratingImpact.levelChange);
  return {
    direction,
    magnitude,
    newLevelLabel: ratingImpact.newLevel.toFixed(1),
    sentence: ratingImpactStandingSentence({ ...ratingImpact, locale }),
    directionText:
      direction === "up"
        ? m.increasedBy(magnitude)
        : direction === "down"
          ? m.decreasedBy(magnitude)
          : m.unchanged,
  };
}
