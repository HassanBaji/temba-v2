import { formatMonth } from "@repo/domain/format-game-start";
import {
  displayLabelFromStoredBand,
  type LevelBand,
} from "@repo/domain/level-bands";
import { zonedParts } from "@repo/domain/product-timezone";
import { isolate } from "@repo/i18n/bidi";
import { isRtl, type Locale } from "@repo/i18n/locale";

const MINUS = "−";

function hundredths(value: number) {
  return Math.round(Math.abs(value) * 100);
}

/** "+0.12", "−0.26", "0.00": a Level change or difference. */
export function signedLevel(value: number): string {
  const size = hundredths(value);
  const text = (size / 100).toFixed(2);
  if (size === 0) {
    return text;
  }
  return value > 0 ? `+${text}` : `${MINUS}${text}`;
}

/** "+.04", "−.03": a Match's Level change under a Last 10 mark. */
export function compactDelta(value: number | null): string | null {
  if (value == null) {
    return null;
  }
  return signedLevel(value).replace(/^([+−]?)0\./, "$1.");
}

/** "▲ 0.12", "▼ 0.26". */
export function arrowLevel(value: number): string {
  const text = (hundredths(value) / 100).toFixed(2);
  return value < 0 ? `▼ ${text}` : `▲ ${text}`;
}

export function displayBand(band: LevelBand): string {
  return displayLabelFromStoredBand(band).replace("-", MINUS);
}

/** A band inside a sentence, kept reading "C+" in Arabic. */
export function bandInText(band: string, locale: Locale): string {
  return isRtl(locale) ? isolate(band) : band;
}

/** "Mar 2026", or "August 2026" with `long`. */
export function monthYear(
  value: Date | string,
  locale: Locale,
  style: "short" | "long" = "short",
): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${formatMonth(date, style, locale)} ${zonedParts(date).year}`;
}

/** Names joined the way the language lists them: "Ali R & Omar S". */
export function nameList(names: readonly string[], locale: Locale): string {
  return new Intl.ListFormat(locale, {
    style: "short",
    type: "conjunction",
  }).format(names);
}
