import { LEVEL_BANDS, type LevelBand } from "~/lib/level-bands";

export const LEVEL_TENTHS_MIN = 0;
export const LEVEL_TENTHS_MAX = 70;

export const LEVEL_BAND_SELECT_NONE = "none" as const;

export type LevelBandSelectValue = LevelBand | typeof LEVEL_BAND_SELECT_NONE;

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

export const LEVEL_RANGE_FIELD_DESCRIPTION =
  "Optional. Inclusive Level bands. None means no bound. Both None means no Level range. Users without a Level must request to play when a range is set.";

export const LEVEL_RANGE_INVERTED_MESSAGE =
  "Minimum Level cannot be greater than Maximum Level";

export type ParseLevelTenthsResult =
  | { ok: true; tenths: number | null }
  | { ok: false; message: string };

const MAJOR_UNIT_PATTERN = /^\d+(?:\.\d)?$/;
const TOO_MANY_FRACTION_DIGITS = /^\d+\.\d{2,}$/;

export function parseOptionalLevelTenths(
  value: string,
): ParseLevelTenthsResult {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, tenths: null };
  }

  if (trimmed.startsWith("-")) {
    return { ok: false, message: "Level cannot be negative" };
  }

  if (!MAJOR_UNIT_PATTERN.test(trimmed)) {
    if (TOO_MANY_FRACTION_DIGITS.test(trimmed)) {
      return { ok: false, message: "Use one decimal place" };
    }
    return { ok: false, message: "Enter a valid Level" };
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
    return { ok: false, message: "Level must be between 0.0 and 7.0" };
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
  return tenthsToLevelBand(tenths);
}

export function parseLevelBandSelectTenths(
  value: string,
  bound: "min" | "max",
): number | null {
  const trimmed = value.trim();
  if (trimmed === "" || trimmed === LEVEL_BAND_SELECT_NONE) {
    return null;
  }
  if (!isLevelBand(trimmed)) {
    return null;
  }
  return bound === "min"
    ? LEVEL_BAND_MIN_TENTHS[trimmed]
    : LEVEL_BAND_MAX_TENTHS[trimmed];
}

export const LEVEL_RANGE_OUTSIDE_MESSAGE =
  "Your Level is outside this Game's range";

export const LEVEL_RANGE_OUTSIDE_PARTY_MESSAGE =
  "A User's Level is outside this Game's range";

export const LEVEL_RANGE_PARTNER_MESSAGE =
  "That User's Level is outside this Game's range";

export const LEVEL_RANGE_TEAM_MESSAGE =
  "A Team partner's Level is outside this Game's range";

export function formatLevelRangeGateCopy(args: {
  levelMinTenths: number | null | undefined;
  levelMaxTenths: number | null | undefined;
  viewerLevelTenths: number | null | undefined;
}): string {
  if (args.viewerLevelTenths == null) {
    return "You don't have a Level yet. Declare one on You, or request to play.";
  }
  const range =
    formatLevelRangeLabel(args.levelMinTenths, args.levelMaxTenths) ??
    "this Game's range";
  return `This Game is for ${range}. Your Level is ${tenthsToLevelBand(args.viewerLevelTenths)}.`;
}

export function formatLevelRangeLabel(
  levelMinTenths: number | null | undefined,
  levelMaxTenths: number | null | undefined,
): string | null {
  const minBand =
    levelMinTenths == null ? null : tenthsToLevelBand(levelMinTenths);
  const maxBand =
    levelMaxTenths == null ? null : tenthsToLevelBand(levelMaxTenths);
  if (minBand && maxBand) {
    if (minBand === maxBand) {
      return `Level ${minBand}`;
    }
    return `Level ${minBand}–${maxBand}`;
  }
  if (minBand) {
    return `Level ${minBand}+`;
  }
  if (maxBand) {
    return `Level ${maxBand} and under`;
  }
  return null;
}
