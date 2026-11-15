import { isolate } from "@repo/i18n/bidi";
import type { Locale } from "@repo/i18n/locale";

import type { LevelHistoryStep } from "./home-level-chart";
import {
  ratingsLevelView,
  type RatingsLevelData,
  type RatingsLevelFooter,
} from "./ratings-screen";
import type { Sport } from "./sport";

/**
 * The Temba Level `ratings.me` reads for one sport, with its recent history
 * on the sport's face for the home Trend.
 */
export type HomeLevelInput = RatingsLevelData & {
  sport: Sport;
  history: readonly string[];
  /** One per history point after the first: what moved the Level there. */
  historySteps: readonly LevelHistoryStep[];
  /** Rated Matches among the history's changes; Level sets are not Matches. */
  historyMatchCount: number;
};

export type HomeLevelView = {
  status: string;
  provisional: boolean;
  /** The padel band in the gauge; null on football, which shows only the number. */
  displayBand: string | null;
  /** "Level" on both faces. */
  numberLabel: string;
  level: string;
  /**
   * Padel: through the band when confirmed, towards confirming while
   * Provisional. Football: along the 40 to 99 scale.
   */
  percent: number;
  /** Football's 40 to 99 bar, filled to the OVR, with its labels. */
  scale: { percent: number; ticks: string[] } | null;
  change: {
    /** "+2" or "−0.15", isolated so the sign stays put in Arabic. */
    signedAmount: string;
    /** "last 8". */
    caption: string;
    /** The face after each counting Match, oldest first. */
    points: number[];
  } | null;
  /** Football before a counting Match: where the number came from. */
  start: string | null;
  footer: RatingsLevelFooter;
  /** The card read as one. */
  spoken: string;
};

/**
 * Home's Level card reads the Temba Level as the Ratings screen does, so
 * the two never disagree: the number on the sport's face (with the band on
 * padel, the 40 to 99 scale on football), what the last eight counting
 * Matches moved it, and the way to confirming, the next band or the last
 * Match. Null before the first Rating.
 */
export function homeLevelView(
  input: HomeLevelInput,
  locale: Locale,
): HomeLevelView | null {
  const view = ratingsLevelView(input, input.sport, locale);
  if (view.kind === "none") {
    return null;
  }
  return {
    status: view.status,
    provisional: view.provisional,
    displayBand: view.band,
    numberLabel: view.numberLabel,
    level: view.number,
    percent: view.ringPercent,
    scale: view.scale,
    change: view.change
      ? {
          signedAmount: isolate(view.change.delta),
          caption: view.change.caption,
          points: view.change.points,
        }
      : null,
    start: view.start,
    footer: view.footer,
    spoken: view.spoken,
  };
}
