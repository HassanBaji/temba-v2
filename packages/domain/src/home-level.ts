import { isolate } from "@repo/i18n/bidi";
import type { Locale } from "@repo/i18n/locale";

import { ratingsLevelView, type RatingsLevelData } from "./ratings-screen";
import type { Sport } from "./sport";

/** The Temba Level `ratings.me` reads for one sport. */
export type HomeLevelInput = RatingsLevelData & { sport: Sport };

export type HomeLevelView = {
  status: string;
  provisional: boolean;
  displayBand: string;
  /** "Level" on both faces (screen 1a). */
  numberLabel: string;
  level: string;
  /** Through the band when confirmed; towards confirming while Provisional. */
  percent: number;
  change: {
    /** "+2" or "−0.15", isolated so the sign stays put in Arabic. */
    signedAmount: string;
    /** "last 8". */
    caption: string;
    /** The face after each counting Match, oldest first. */
    points: number[];
  } | null;
  /** "Next band B−, 40% of the way", or "To confirm 2 of 5 matches". */
  footer: { label: string; value: string | null; detail: string | null };
  /** The card read as one. */
  spoken: string;
};

/**
 * Home's Level card reads the Temba Level as the Ratings screen does
 * (screens 1a, 1b), so the two never disagree: the band, the number on the
 * sport's face, what the last eight counting Matches moved it, and the way to
 * the next band or to confirming. Null before the first Rating.
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
    change: view.change
      ? {
          signedAmount: isolate(view.change.delta),
          caption: view.change.caption,
          points: view.change.points,
        }
      : null,
    footer: view.footer,
    spoken: view.spoken,
  };
}
