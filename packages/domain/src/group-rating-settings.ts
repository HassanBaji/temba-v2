import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/**
 * Rating settings of a tier Group (ADR-0068, screens 3a and 3b): who gives
 * Performance ratings after a Game, how much of each move they make, and
 * whether an Organizer's rating counts double. Each Match snapshots them when
 * it completes, so a change applies from the next Game.
 */

export const PERFORMANCE_RATING_MODES = [
  "off",
  "organizer",
  "everyone",
] as const;

export type PerformanceRatingMode = (typeof PERFORMANCE_RATING_MODES)[number];

/** Light, standard and heavy, in percent of the move (spec §8, tunable). */
export const PERFORMANCE_WEIGHTS = [20, 30, 50] as const;

export type PerformanceWeight = (typeof PERFORMANCE_WEIGHTS)[number];

export type GroupRatingSettings = {
  mode: PerformanceRatingMode;
  weightPercent: number;
  organizerCountsDouble: boolean;
};

export const DEFAULT_GROUP_RATING_SETTINGS: GroupRatingSettings = {
  mode: "off",
  weightPercent: 30,
  organizerCountsDouble: false,
};

type WeightKey = "light" | "standard" | "heavy";

const WEIGHT_KEYS: Record<PerformanceWeight, WeightKey> = {
  20: "light",
  30: "standard",
  50: "heavy",
};

export function isPerformanceWeight(value: number): value is PerformanceWeight {
  return (PERFORMANCE_WEIGHTS as readonly number[]).includes(value);
}

export function isPerformanceRatingMode(
  value: string,
): value is PerformanceRatingMode {
  return (PERFORMANCE_RATING_MODES as readonly string[]).includes(value);
}

function weightKey(weightPercent: number): WeightKey {
  return isPerformanceWeight(weightPercent)
    ? WEIGHT_KEYS[weightPercent]
    : "standard";
}

/** The hint under "Rating settings" in the Group's menu (screen 3a). */
export function ratingSettingsSummary(
  settings: GroupRatingSettings,
  locale: Locale,
) {
  const m = messagesFor(locale).rating.settings;
  const weight = m.weightName[weightKey(settings.weightPercent)];
  switch (settings.mode) {
    case "off":
      return m.summary.off;
    case "organizer":
      return m.summary.organizer(weight);
    case "everyone":
      return m.summary.everyone(weight);
  }
}

/**
 * How ratings work in this Group, in one sentence: the read-only line members
 * see under Standing, and the start of the settings screen's footnote.
 */
export function ratingSettingsLine(
  settings: GroupRatingSettings,
  locale: Locale,
) {
  const m = messagesFor(locale).rating.settingsLine;
  switch (settings.mode) {
    case "off":
      return m.resultsOnly;
    case "organizer":
      return m.organizer(settings.weightPercent);
    case "everyone":
      return settings.organizerCountsDouble
        ? m.everyoneDouble(settings.weightPercent)
        : m.everyone(settings.weightPercent);
  }
}

export type RatingSettingsModeOption = {
  mode: PerformanceRatingMode;
  title: string;
  description: string;
  selected: boolean;
};

export type RatingSettingsWeightOption = {
  weightPercent: PerformanceWeight;
  label: string;
  selected: boolean;
};

export type RatingSettingsScreen = {
  title: string;
  afterEachGame: string;
  performanceRatings: string;
  modes: RatingSettingsModeOption[];
  /** Absent while ratings are Off: only the result moves points. */
  weight: {
    title: string;
    name: string;
    resultPercent: string;
    resultShare: string;
    performancePercent: string;
    performanceShare: string;
    /** 0 to 1, the result's part of the bar. */
    resultFraction: number;
    spoken: string;
    options: RatingSettingsWeightOption[];
    note: string;
  } | null;
  /** Only when everyone rates: the toggle and the rules that are always on. */
  fairness: {
    title: string;
    countsDouble: string;
    countsDoubleHint: string;
    countsDoubleOn: boolean;
    alwaysOn: string;
  } | null;
  manualChanges: {
    title: string;
    rows: { label: string; value: string }[];
  };
  footnote: string;
};

/** Screen 3b's view-model on the Organizer's draft. */
export function ratingSettingsScreen(
  draft: GroupRatingSettings,
  locale: Locale,
): RatingSettingsScreen {
  const m = messagesFor(locale).rating.settings;
  const key = weightKey(draft.weightPercent);
  const performance = isPerformanceWeight(draft.weightPercent)
    ? draft.weightPercent
    : DEFAULT_GROUP_RATING_SETTINGS.weightPercent;
  const result = 100 - performance;
  return {
    title: m.title,
    afterEachGame: m.afterEachGame,
    performanceRatings: m.performanceRatings,
    modes: PERFORMANCE_RATING_MODES.map((mode) => ({
      mode,
      title: m.modes[mode].title,
      description: m.modes[mode].description,
      selected: draft.mode === mode,
    })),
    weight:
      draft.mode === "off"
        ? null
        : {
            title: m.howMuch,
            name: m.weightName[key],
            resultPercent: m.percent(result),
            resultShare: m.resultShare,
            performancePercent: m.percent(performance),
            performanceShare: m.performanceShare,
            resultFraction: result / 100,
            spoken: m.splitSpoken(result, performance),
            options: PERFORMANCE_WEIGHTS.map((weightPercent) => ({
              weightPercent,
              label: m.weights[WEIGHT_KEYS[weightPercent]],
              selected: draft.weightPercent === weightPercent,
            })),
            note: m.weightNote[key],
          },
    fairness:
      draft.mode === "everyone"
        ? {
            title: m.fairness,
            countsDouble: m.countsDouble,
            countsDoubleHint: m.countsDoubleHint,
            countsDoubleOn: draft.organizerCountsDouble,
            alwaysOn: m.alwaysOn,
          }
        : null,
    manualChanges: {
      title: m.manualChanges,
      rows: [
        { label: m.whoCanAdjust, value: m.organizersOnly },
        { label: m.reason, value: m.alwaysRequired },
        { label: m.shownToPlayer, value: m.inTheirHistory },
      ],
    },
    footnote: m.appliesFromNextGame(ratingSettingsLine(draft, locale)),
  };
}

export function ratingSettingsChanged(
  initial: GroupRatingSettings,
  draft: GroupRatingSettings,
) {
  return (
    initial.mode !== draft.mode ||
    initial.weightPercent !== draft.weightPercent ||
    initial.organizerCountsDouble !== draft.organizerCountsDouble
  );
}
