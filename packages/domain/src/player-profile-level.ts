import {
  BAND_LOWER_HUNDREDTHS,
  BAND_UPPER_HUNDREDTHS,
  clampLevel,
  formatLevel,
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
      displayBand: string;
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

function percentThroughDisplayBand(levelValue: number, band: LevelBand) {
  const span = displayBandSpan(band);
  const lower = Math.round(span.lower * 100);
  const width = Math.round(span.upper * 100) - lower;
  return clampPercent(((hundredths(levelValue) - lower) / width) * 100);
}

function distanceToNextRung(
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

function ratedMatchesLine(count: number) {
  return `Confirmed, ${count} rated ${count === 1 ? "match" : "matches"}`;
}

export function playerLevelCardView(
  input: PlayerLevelInput | null,
): PlayerLevelCardView {
  if (!input) {
    return { kind: "none", label: "No Level yet" };
  }

  const displayBand = displayLabelFromStoredBand(input.levelBand);
  const level = formatLevel(input.levelValue);
  const base = {
    kind: "rated" as const,
    displayBand,
    level,
    provisional: input.provisional,
  };

  if (input.provisional) {
    const caption = confirmationProgressCaption(
      input.ratedMatchCount,
      input.ratedMatchesRemaining,
    );
    return {
      ...base,
      lines: [caption],
      fillPercent: clampPercent(
        confirmationFraction(
          input.ratedMatchCount,
          input.ratedMatchesRemaining,
        ) * 100,
      ),
      accessibilityLabel: `Level ${displayBand} ${level}, Provisional. ${caption}`,
    };
  }

  const next = nextDistinctDisplayRung(input.levelBand);
  const confirmed = ratedMatchesLine(input.ratedMatchCount);
  if (next == null) {
    return {
      ...base,
      lines: [confirmed, "Top Level band"],
      fillPercent: 100,
      accessibilityLabel: `Level ${displayBand} ${level}. ${confirmed}. Top Level band`,
    };
  }

  const percent = percentThroughDisplayBand(input.levelValue, input.levelBand);
  const progress = `${distanceToNextRung(input.levelValue, next)} to ${next} · ${percent}% through ${displayBand}`;
  return {
    ...base,
    lines: [confirmed, progress],
    fillPercent: percent,
    accessibilityLabel: `Level ${displayBand} ${level}. ${confirmed}. ${progress}`,
  };
}
