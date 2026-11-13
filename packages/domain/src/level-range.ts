import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr, ovrFromLevel } from "./football-ovr";
import { formatPadelLevel } from "./level";
import {
  displayLabelFromStoredBand,
  isAssignableDisplayLevelBand,
  LEVEL_BANDS,
  type AssignableDisplayLevelBand,
  type LevelBand,
} from "./level-bands";

export const LEVEL_TENTHS_MIN = 0;
export const LEVEL_TENTHS_MAX = 70;

export const LEVEL_BAND_SELECT_NONE = "none" as const;

export type LevelBandSelectValue =
  | LevelBand
  | AssignableDisplayLevelBand
  | typeof LEVEL_BAND_SELECT_NONE;

/** Inclusive displayed tenths at the lower edge of each Level band. */
export const LEVEL_BAND_MIN_TENTHS: Record<LevelBand, number> = {
  D3: 0,
  D2: 7,
  D1: 14,
  C3: 21,
  C2: 28,
  C1: 35,
  B3: 42,
  B2: 49,
  B1: 56,
  A: 63,
};

/** Inclusive displayed tenths at the upper edge of each Level band. */
export const LEVEL_BAND_MAX_TENTHS: Record<LevelBand, number> = {
  D3: 6,
  D2: 13,
  D1: 20,
  C3: 27,
  C2: 34,
  C1: 41,
  B3: 48,
  B2: 55,
  B1: 62,
  A: 70,
};

export function levelRangeInvertedMessage(locale: Locale) {
  return messagesFor(locale).level.rangeInverted;
}

export type ParseLevelTenthsResult =
  | { ok: true; tenths: number | null }
  | { ok: false; message: string };

const MAJOR_UNIT_PATTERN = /^\d+(?:\.\d)?$/;
const TOO_MANY_FRACTION_DIGITS = /^\d+\.\d{2,}$/;

export function parseOptionalLevelTenths(
  value: string,
  locale: Locale,
): ParseLevelTenthsResult {
  const m = messagesFor(locale).level;
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, tenths: null };
  }

  if (trimmed.startsWith("-")) {
    return { ok: false, message: m.negative };
  }

  if (!MAJOR_UNIT_PATTERN.test(trimmed)) {
    if (TOO_MANY_FRACTION_DIGITS.test(trimmed)) {
      return { ok: false, message: m.oneDecimal };
    }
    return { ok: false, message: m.invalid };
  }

  const dot = trimmed.indexOf(".");
  const wholeText = dot === -1 ? trimmed : trimmed.slice(0, dot);
  const fractionText = dot === -1 ? "0" : trimmed.slice(dot + 1);
  const whole = Number(wholeText);
  const fraction = Number(fractionText);
  const tenths = whole * 10 + fraction;

  if (
    !Number.isSafeInteger(tenths) ||
    tenths < LEVEL_TENTHS_MIN ||
    tenths > LEVEL_TENTHS_MAX
  ) {
    return { ok: false, message: m.between };
  }

  return { ok: true, tenths };
}

export function formatLevelTenths(
  tenths: number | null | undefined,
): string | null {
  if (tenths == null) {
    return null;
  }
  const clamped = Math.min(
    LEVEL_TENTHS_MAX,
    Math.max(LEVEL_TENTHS_MIN, tenths),
  );
  return (clamped / 10).toFixed(1);
}

export function tenthsToMajorInput(tenths: number | null | undefined): string {
  return formatLevelTenths(tenths) ?? "";
}

export function isLevelBand(value: string): value is LevelBand {
  return LEVEL_BANDS.some((band) => band === value);
}

/**
 * Strict Level band from displayed tenths (same table as `bandFromLevel`:
 * 2.1 → C3, 3.5 → C1, 4.2 → B3, 7.0 → A).
 */
export function tenthsToLevelBand(tenths: number): LevelBand {
  const clamped = Math.min(
    LEVEL_TENTHS_MAX,
    Math.max(LEVEL_TENTHS_MIN, tenths),
  );
  if (clamped >= 63) {
    return "A";
  }
  if (clamped >= 56) {
    return "B1";
  }
  if (clamped >= 49) {
    return "B2";
  }
  if (clamped >= 42) {
    return "B3";
  }
  if (clamped >= 35) {
    return "C1";
  }
  if (clamped >= 28) {
    return "C2";
  }
  if (clamped >= 21) {
    return "C3";
  }
  if (clamped >= 14) {
    return "D1";
  }
  if (clamped >= 7) {
    return "D2";
  }
  return "D3";
}

export function tenthsToLevelBandSelectValue(
  tenths: number | null | undefined,
): LevelBandSelectValue {
  if (tenths == null) {
    return LEVEL_BAND_SELECT_NONE;
  }
  return displayLabelFromStoredBand(tenthsToLevelBand(tenths));
}

function displayTenthsForBound(
  label: AssignableDisplayLevelBand,
  bound: "min" | "max",
): number {
  const tenths = LEVEL_BANDS.filter(
    (band) => displayLabelFromStoredBand(band) === label,
  ).map((band) =>
    bound === "min" ? LEVEL_BAND_MIN_TENTHS[band] : LEVEL_BAND_MAX_TENTHS[band],
  );
  return bound === "min" ? Math.min(...tenths) : Math.max(...tenths);
}

export function parseLevelBandSelectTenths(
  value: string,
  bound: "min" | "max",
): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === LEVEL_BAND_SELECT_NONE) {
    return null;
  }
  if (isAssignableDisplayLevelBand(trimmed)) {
    return displayTenthsForBound(trimmed, bound);
  }
  if (isLevelBand(trimmed)) {
    return bound === "min"
      ? LEVEL_BAND_MIN_TENTHS[trimmed]
      : LEVEL_BAND_MAX_TENTHS[trimmed];
  }
  return null;
}

/** A Level range bound in OVR, for a football Game (ADR-0069). */
function ovrOfTenths(tenths: number) {
  const clamped = Math.min(
    LEVEL_TENTHS_MAX,
    Math.max(LEVEL_TENTHS_MIN, tenths),
  );
  return formatOvr(ovrFromLevel(clamped / 10));
}

function formatOvrRangeLabel(
  levelMinTenths: number | null | undefined,
  levelMaxTenths: number | null | undefined,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).level;
  const min = levelMinTenths == null ? null : ovrOfTenths(levelMinTenths);
  const max = levelMaxTenths == null ? null : ovrOfTenths(levelMaxTenths);
  if (min && max) {
    return min === max ? m.ovr(min) : m.ovrRange(min, max);
  }
  if (min) {
    return m.ovrAndUp(min);
  }
  if (max) {
    return m.ovrAndUnder(max);
  }
  return null;
}

/**
 * A Level range as its sport reads a Level: "OVR 60 to 72" on football, and
 * the padel Level to one decimal, "2.8 to 4.8". Null when neither end is set.
 */
export function formatLevelRangeFaceLabel(
  levelMinTenths: number | null | undefined,
  levelMaxTenths: number | null | undefined,
  locale: Locale,
  sport?: string | null,
): string | null {
  if (sport === "football") {
    return formatOvrRangeLabel(levelMinTenths, levelMaxTenths, locale);
  }
  const m = messagesFor(locale).level;
  const min =
    levelMinTenths == null ? null : formatPadelLevel(levelMinTenths / 10, 1);
  const max =
    levelMaxTenths == null ? null : formatPadelLevel(levelMaxTenths / 10, 1);
  if (min && max) {
    return min === max ? min : m.range(min, max);
  }
  if (min) {
    return m.andUp(min);
  }
  if (max) {
    return m.andUnder(max);
  }
  return null;
}

/** A Game's Level range: in Level bands, and in OVR on football. */
export function formatLevelRangeLabel(
  levelMinTenths: number | null | undefined,
  levelMaxTenths: number | null | undefined,
  locale: Locale,
  sport?: string | null,
): string | null {
  if (sport === "football") {
    return formatOvrRangeLabel(levelMinTenths, levelMaxTenths, locale);
  }
  const messages = messagesFor(locale);
  const m = messages.level;
  const minLabel =
    levelMinTenths == null
      ? null
      : displayLabelFromStoredBand(tenthsToLevelBand(levelMinTenths));
  const maxLabel =
    levelMaxTenths == null
      ? null
      : displayLabelFromStoredBand(tenthsToLevelBand(levelMaxTenths));
  if (minLabel && maxLabel) {
    if (minLabel === maxLabel) {
      return messages.common.isolate(minLabel);
    }
    return messages.common.isolate(`${minLabel}/${maxLabel}`);
  }
  if (minLabel) {
    return m.andUp(minLabel);
  }
  if (maxLabel) {
    return m.andUnder(maxLabel);
  }
  return null;
}

export function formatLevelRangeProseLabel(
  levelMinTenths: number | null | undefined,
  levelMaxTenths: number | null | undefined,
  locale: Locale,
  sport?: string | null,
): string | null {
  const label = formatLevelRangeLabel(
    levelMinTenths,
    levelMaxTenths,
    locale,
    sport,
  );
  if (!label) {
    return null;
  }
  return sport === "football" ? label : messagesFor(locale).level.prose(label);
}

export function formatLevelRangeGateCopy(args: {
  levelMinTenths: number | null | undefined;
  levelMaxTenths: number | null | undefined;
  viewerLevelTenths: number | null | undefined;
  locale: Locale;
  sport?: string | null;
}): string {
  const m = messagesFor(args.locale).level;
  const range =
    formatLevelRangeProseLabel(
      args.levelMinTenths,
      args.levelMaxTenths,
      args.locale,
      args.sport,
    ) ?? m.gateRangeFallback;
  if (args.viewerLevelTenths == null) {
    // A padel Level does not count on a football Game: with no football
    // Rating the player is outside any OVR range.
    return args.sport === "football" ? m.gateNoOvr(range) : m.gateNoLevel;
  }
  return m.gate(
    range,
    args.sport === "football"
      ? m.ovr(ovrOfTenths(args.viewerLevelTenths))
      : displayLabelFromStoredBand(tenthsToLevelBand(args.viewerLevelTenths)),
  );
}
