import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatOvr,
  ovrFromLevel,
  ovrScalePercent,
  type LevelFace,
} from "./football-ovr";
import {
  BAND_LOWER_HUNDREDTHS,
  BAND_UPPER_HUNDREDTHS,
  clampLevel,
  formatPadelLevel,
} from "./level";
import {
  LEVEL_BANDS,
  displayLabelFromStoredBand,
  nextDistinctDisplayRung,
  storedBandFromDisplayLabel,
  type AssignableDisplayLevelBand,
  type LevelBand,
} from "./level-bands";
import {
  confirmationFraction,
  confirmationProgressCaption,
} from "./profile-level";

/** The Level at which the stored band actually moves up (ADR-0009). */
const HYSTERESIS_HUNDREDTHS = 10;

export type PlayerLevelInput = {
  levelBand: LevelBand;
  /** Continuous Level, for the distance and progress copy. */
  levelValue: number;
  provisional: boolean;
  ratedMatchCount: number;
  ratedMatchesRemaining: number;
};

export type PlayerLevelCardView =
  | { kind: "none"; label: string }
  | {
      kind: "rated";
      /** Null on the OVR face: football shows no band. */
      displayBand: string | null;
      level: string;
      provisional: boolean;
      lines: string[];
      fillPercent: number;
      accessibilityLabel: string;
    };

function hundredths(level: number) {
  return Math.round(clampLevel(level) * 100 + 1e-8);
}

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Lower and upper Level of every stored band that shares the display label. */
export function displayBandSpan(band: LevelBand): {
  lower: number;
  upper: number;
} {
  const label = displayLabelFromStoredBand(band);
  const members = LEVEL_BANDS.filter(
    (stored) => displayLabelFromStoredBand(stored) === label,
  );
  const lower = Math.min(...members.map((s) => BAND_LOWER_HUNDREDTHS[s]));
  const upper = Math.max(...members.map((s) => BAND_UPPER_HUNDREDTHS[s]));
  return { lower: lower / 100, upper: upper / 100 };
}

export function percentThroughDisplayBand(levelValue: number, band: LevelBand) {
  const span = displayBandSpan(band);
  const lower = Math.round(span.lower * 100);
  const width = Math.round(span.upper * 100) - lower;
  return clampPercent(((hundredths(levelValue) - lower) / width) * 100);
}

/** "0.3": how far a padel Level is from the next rung. */
export function distanceToNextRung(
  levelValue: number,
  next: AssignableDisplayLevelBand,
) {
  const target =
    BAND_LOWER_HUNDREDTHS[storedBandFromDisplayLabel(next)] +
    HYSTERESIS_HUNDREDTHS;
  const tenths = Math.max(
    1,
    Math.round((target - hundredths(levelValue)) / 10),
  );
  return (tenths / 10).toFixed(1);
}

/** The Level as its face shows it: the padel "3.92", or the OVR "72". */
export function shownLevel(levelValue: number, face: LevelFace = "level") {
  return face === "ovr"
    ? formatOvr(ovrFromLevel(levelValue))
    : formatPadelLevel(levelValue, 2);
}

export function playerLevelCardView(
  input: PlayerLevelInput | null,
  locale: Locale,
  face: LevelFace = "level",
): PlayerLevelCardView {
  const m = messagesFor(locale).profile;
  if (!input) {
    return { kind: "none", label: m.levelCard.noLevelYet };
  }

  const level = shownLevel(input.levelValue, face);
  if (face === "ovr") {
    return ovrLevelCardView(input, level, locale);
  }

  const displayBand = displayLabelFromStoredBand(input.levelBand);
  const base = {
    kind: "rated" as const,
    displayBand,
    level,
    provisional: input.provisional,
  };

  if (input.provisional) {
    const caption = confirmationProgressCaption(
      input.ratedMatchesRemaining,
      locale,
    );
    return {
      ...base,
      lines: [caption],
      fillPercent: clampPercent(
        confirmationFraction(input.ratedMatchesRemaining) * 100,
      ),
      accessibilityLabel: m.levelCard.spokenProvisional(
        displayBand,
        level,
        caption,
      ),
    };
  }

  const next = nextDistinctDisplayRung(input.levelBand);
  const confirmed = m.levelCard.confirmedRated(input.ratedMatchCount);
  if (next == null) {
    const lines = [confirmed, m.level.topBand];
    return {
      ...base,
      lines,
      fillPercent: 100,
      accessibilityLabel: m.levelCard.spokenLevel(
        displayBand,
        level,
        lines.join(". "),
      ),
    };
  }

  const percent = percentThroughDisplayBand(input.levelValue, input.levelBand);
  const lines = [
    confirmed,
    m.levelCard.distanceProgress(
      distanceToNextRung(input.levelValue, next),
      next,
      percent,
      displayBand,
    ),
  ];
  return {
    ...base,
    lines,
    fillPercent: percent,
    accessibilityLabel: m.levelCard.spokenLevel(
      displayBand,
      level,
      lines.join(". "),
    ),
  };
}

/**
 * The OVR face names no band and no way to the next one: a Confirmed OVR
 * fills along the 40 to 99 scale.
 */
function ovrLevelCardView(
  input: PlayerLevelInput,
  level: string,
  locale: Locale,
): PlayerLevelCardView {
  const m = messagesFor(locale).profile;
  const base = {
    kind: "rated" as const,
    displayBand: null,
    level,
    provisional: input.provisional,
  };
  if (input.provisional) {
    const caption = confirmationProgressCaption(
      input.ratedMatchesRemaining,
      locale,
    );
    return {
      ...base,
      lines: [caption],
      fillPercent: clampPercent(
        confirmationFraction(input.ratedMatchesRemaining) * 100,
      ),
      accessibilityLabel: m.levelCard.spokenOvrProvisional(level, caption),
    };
  }
  const lines = [m.levelCard.confirmedRated(input.ratedMatchCount)];
  return {
    ...base,
    lines,
    fillPercent: clampPercent(ovrScalePercent(ovrFromLevel(input.levelValue))),
    accessibilityLabel: m.levelCard.spokenOvr(level, lines.join(". ")),
  };
}
