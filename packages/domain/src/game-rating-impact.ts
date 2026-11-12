import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatOvr,
  formatOvrDelta,
  formatOvrPrecise,
  OVR_PART_WEIGHTS,
} from "./football-ovr";
import {
  gameRatingScopeLabel,
  groupRatingScopeNote,
  tembaRatingScopeNote,
  type GameRatingScope,
} from "./game-rating-scope";
import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";

export function unratedLabel(locale: Locale) {
  return messagesFor(locale).common.unrated;
}

export function unratedGameLine(locale: Locale) {
  return messagesFor(locale).game.rating.unratedGameLine;
}

/**
 * A Game's Rating scope (ADR-0053). An endpoint that does not return the
 * scope yet only says whether the Game moves the Temba Level.
 */
export function ratingScopeOf(game: {
  rated: boolean;
  ratingScope?: GameRatingScope | null;
}): GameRatingScope {
  return game.ratingScope ?? (game.rated ? "temba" : "unrated");
}

/**
 * The tag a Game card or row carries: its scope, none when a padel Game is
 * Temba rated. A football Game that counts says so (ADR-0069).
 */
export function ratingScopeTag(
  game: {
    rated: boolean;
    ratingScope?: GameRatingScope | null;
    sport?: string | null;
  },
  locale: Locale,
): string | null {
  const scope = ratingScopeOf(game);
  return scope === "temba" && game.sport !== "football"
    ? null
    : gameRatingScopeLabel(scope, locale, game.sport);
}

/**
 * The Game details notice for a Game that does not move the Temba Level, and
 * for a football Game that does.
 */
export function ratingScopeNotice(
  scope: GameRatingScope,
  locale: Locale,
  sport?: string | null,
): { title: string; line: string } | null {
  if (scope === "temba" && sport !== "football") {
    return null;
  }
  return {
    title: gameRatingScopeLabel(scope, locale, sport),
    line:
      scope === "temba"
        ? tembaRatingScopeNote(locale, sport)
        : scope === "group"
          ? groupRatingScopeNote(locale, sport)
          : messagesFor(locale).game.rating.unratedGameLine,
  };
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

/** What a counting football Match did to the viewer's OVR (screen 5a). */
export type OvrImpact = {
  before: number;
  after: number;
  resultPart: number;
  outcome: "won" | "drew" | "lost";
  /** The other side's mean OVR before the Match. */
  opponentAverage: number;
};

export type OvrImpactRow = {
  title: string;
  detail: string;
  delta: string;
  spoken: string;
};

export type OvrImpactView = {
  tag: string;
  title: string;
  /** "74 to 75", in whole OVR. */
  aside: string;
  rows: OvrImpactRow[];
  total: OvrImpactRow;
};

function percentOf(share: number) {
  return Math.round(share * 100);
}

/**
 * Screen 5a's "What moved your OVR": one row per part that moved, then the
 * move in one decimal with where the Level stands. Only the result part is
 * written so far; the others join as they are.
 */
export function ovrImpactView(
  impact: {
    ovr: OvrImpact;
    newLevelBand: LevelBand;
    isProvisional: boolean;
    ratedMatchesRemainingToConfirm: number | null;
  },
  locale: Locale,
): OvrImpactView {
  const copy = messagesFor(locale).rating.ovrImpact;
  const { ovr } = impact;
  const opponents = formatOvr(ovr.opponentAverage);
  const resultTitle = copy.result(percentOf(OVR_PART_WEIGHTS.result));
  const resultDelta = formatOvrDelta(ovr.resultPart);
  const totalTitle = copy.move(
    formatOvrPrecise(ovr.before),
    formatOvrPrecise(ovr.after),
  );
  const totalDelta = formatOvrDelta(ovr.after - ovr.before);
  return {
    tag: gameRatingScopeLabel("temba", locale, "football"),
    title: copy.title,
    aside: copy.move(formatOvr(ovr.before), formatOvr(ovr.after)),
    rows: [
      {
        title: resultTitle,
        detail: copy.outcome[ovr.outcome](opponents),
        delta: resultDelta,
        spoken: copy.spoken(resultTitle, resultDelta),
      },
    ],
    total: {
      title: totalTitle,
      detail: ratingImpactStandingSentence({ ...impact, locale }),
      delta: totalDelta,
      spoken: copy.spoken(totalTitle, totalDelta),
    },
  };
}
