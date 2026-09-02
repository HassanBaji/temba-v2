export const LEVEL_TENTHS_MIN = 0;
export const LEVEL_TENTHS_MAX = 70;

export const LEVEL_RANGE_FIELD_DESCRIPTION =
  "Optional. Inclusive, one decimal (0.0–7.0). Leave blank for no bound. Both blank means no Level range. Users without a Level must request to play when a range is set.";

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

export function formatLevelRangeLabel(
  levelMinTenths: number | null | undefined,
  levelMaxTenths: number | null | undefined,
): string | null {
  const minLabel = formatLevelTenths(levelMinTenths);
  const maxLabel = formatLevelTenths(levelMaxTenths);
  if (minLabel && maxLabel) {
    return `Level ${minLabel}–${maxLabel}`;
  }
  if (minLabel) {
    return `Level ${minLabel}+`;
  }
  if (maxLabel) {
    return `Level ${maxLabel} and under`;
  }
  return null;
}
