import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  ASSIGNABLE_DISPLAY_LEVEL_BANDS,
  displayLabelFromStoredBand,
  LEVEL_BANDS,
  type AssignableDisplayLevelBand,
} from "./level-bands";
import {
  LEVEL_BAND_MIN_TENTHS,
  LEVEL_TENTHS_MAX,
  LEVEL_TENTHS_MIN,
  tenthsToLevelBand,
} from "./level-range";
import { shortPlayerName } from "./player-name";
import { formatPastDay } from "./request-meta";

export type LevelSliderRung = {
  label: AssignableDisplayLevelBand;
  lowerTenths: number;
  upperTenths: number;
};

function lowerTenthsOf(label: AssignableDisplayLevelBand): number {
  return Math.min(
    ...LEVEL_BANDS.filter(
      (band) => displayLabelFromStoredBand(band) === label,
    ).map((band) => LEVEL_BAND_MIN_TENTHS[band]),
  );
}

const RUNGS: readonly LevelSliderRung[] = ASSIGNABLE_DISPLAY_LEVEL_BANDS.map(
  (label, index) => {
    const next = ASSIGNABLE_DISPLAY_LEVEL_BANDS[index + 1];
    return {
      label,
      lowerTenths: lowerTenthsOf(label),
      upperTenths: next ? lowerTenthsOf(next) : LEVEL_TENTHS_MAX,
    };
  },
);

export const LEVEL_SLIDER_TICKS = {
  edgesTenths: RUNGS.slice(1).map((rung) => rung.lowerTenths),
  letters: RUNGS.map((rung) => ({
    label: rung.label,
    centreTenths: Math.round((rung.lowerTenths + rung.upperTenths) / 2),
  })),
  startLabel: "0.0",
  endLabel: "7.0",
};

export function clampLevelTenths(value: number): number {
  const rounded = Math.round(value);
  return Math.min(LEVEL_TENTHS_MAX, Math.max(LEVEL_TENTHS_MIN, rounded));
}

/** A member with no Level yet starts from the default placement, 3.0. */
export const LEVEL_SLIDER_DEFAULT_TENTHS = 30;

/** Where the slider starts for a member whose Level reads `level` ("3.2"). */
export function levelSliderStartTenths(level: string | null): number {
  return level
    ? clampLevelTenths(Number(level) * 10)
    : LEVEL_SLIDER_DEFAULT_TENTHS;
}

function formatTenths(tenths: number): string {
  return (tenths / 10).toFixed(1);
}

function rungForTenths(tenths: number): LevelSliderRung {
  const label = displayLabelFromStoredBand(tenthsToLevelBand(tenths));
  return RUNGS.find((rung) => rung.label === label) ?? RUNGS[0]!;
}

export function levelSliderLabel(tenths: number): string {
  const clamped = clampLevelTenths(tenths);
  return `${rungForTenths(clamped).label} ${formatTenths(clamped)}`;
}

export function levelSliderReadout(args: {
  tenths: number;
  currentTenths: number;
}) {
  const tenths = clampLevelTenths(args.tenths);
  const delta = tenths - clampLevelTenths(args.currentTenths);
  const rung = rungForTenths(tenths);
  const next = RUNGS[RUNGS.indexOf(rung) + 1];
  const span = rung.upperTenths - rung.lowerTenths;

  let deltaLabel = formatTenths(0);
  if (delta > 0) {
    deltaLabel = `+${formatTenths(delta)}`;
  } else if (delta < 0) {
    deltaLabel = `−${formatTenths(-delta)}`;
  }

  return {
    displayBand: rung.label,
    levelLabel: formatTenths(tenths),
    deltaLabel,
    rung: {
      label: rung.label,
      lowerTenths: rung.lowerTenths,
      upperTenths: rung.upperTenths,
    },
    percentThroughRung: Math.round(((tenths - rung.lowerTenths) / span) * 100),
    toNext: next
      ? {
          label: next.label,
          distanceLabel: formatTenths(rung.upperTenths - tenths),
        }
      : null,
  };
}

export const LEVEL_OVERRIDE_REASONS = [
  "new_to_group",
  "plays_above_results",
  "plays_below_results",
  "back_from_injury",
  "correcting_a_mistake",
] as const;

export type LevelOverrideReason = (typeof LEVEL_OVERRIDE_REASONS)[number];

export function levelOverrideReasonLabel(
  reason: LevelOverrideReason,
  locale: Locale,
): string {
  const m = messagesFor(locale).level.overrideReason;
  switch (reason) {
    case "new_to_group":
      return m.newToGroup;
    case "plays_above_results":
      return m.playsAboveResults;
    case "plays_below_results":
      return m.playsBelowResults;
    case "back_from_injury":
      return m.backFromInjury;
    case "correcting_a_mistake":
      return m.correctingAMistake;
  }
}

/** `Set by you, today` or `Set by Sara K, 3 days ago`. */
export function levelOverrideCaption(args: {
  setByIsViewer: boolean;
  setByName: string;
  createdAt: Date | string;
  locale: Locale;
  now?: Date;
}): string {
  const m = messagesFor(args.locale).level;
  const who = args.setByIsViewer
    ? m.overrideByYou
    : shortPlayerName(args.setByName);
  return m.overrideCaption(
    who,
    formatPastDay(args.createdAt, args.locale, args.now),
  );
}
