import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const PRICE_PER_PLAYER_MAX_FILS = 1_000_000_000;

export type ParsePricePerPlayerResult =
  | { ok: true; fils: number | null }
  | { ok: false; message: string };

const MAJOR_UNIT_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const TOO_MANY_FRACTION_DIGITS = /^\d+\.\d{4,}$/;

export function parseOptionalPricePerPlayerFils(
  value: string,
  locale: Locale,
): ParsePricePerPlayerResult {
  const m = messagesFor(locale).createGame.price;
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, fils: null };
  }

  if (trimmed.startsWith("-")) {
    return { ok: false, message: m.negative };
  }

  if (!MAJOR_UNIT_PATTERN.test(trimmed)) {
    if (TOO_MANY_FRACTION_DIGITS.test(trimmed)) {
      return { ok: false, message: m.tooManyDecimals };
    }
    return { ok: false, message: m.invalid };
  }

  const dot = trimmed.indexOf(".");
  const wholeText = dot === -1 ? trimmed : trimmed.slice(0, dot);
  const fractionText = dot === -1 ? "" : trimmed.slice(dot + 1);
  const whole = Number(wholeText);
  const fraction = Number((fractionText + "000").slice(0, 3));
  const fils = whole * 1000 + fraction;

  if (!Number.isSafeInteger(fils) || fils > PRICE_PER_PLAYER_MAX_FILS) {
    return { ok: false, message: m.tooLarge };
  }

  return { ok: true, fils };
}

export function formatPricePerPlayerFils(
  fils: number | null | undefined,
  locale: Locale,
): string | null {
  if (fils == null) {
    return null;
  }
  if (fils === 0) {
    return messagesFor(locale).createGame.price.free;
  }
  return formatMajorUnitsWithCurrency(fils, locale);
}

export function formatPricePerPlayerCardMeta(
  fils: number | null | undefined,
  locale: Locale,
): string | null {
  const m = messagesFor(locale).createGame.price;
  if (fils == null) {
    return null;
  }
  if (fils === 0) {
    return m.free;
  }
  return m.perPlayer(formatMajorUnitsWithCurrency(fils, locale));
}

export function filsToMajorInput(fils: number | null | undefined): string {
  if (fils == null) {
    return "";
  }
  return formatMajorUnitsFromFils(fils);
}

/** Major units without the currency, `18.000`. */
export function formatMajorUnitsFromFils(fils: number): string {
  const abs = fils < 0 ? -fils : fils;
  const whole = Math.trunc(abs / 1000);
  const fraction = abs % 1000;
  const body = `${whole}.${String(fraction).padStart(3, "0")}`;
  return fils < 0 ? `-${body}` : body;
}

function formatMajorUnitsWithCurrency(fils: number, locale: Locale): string {
  return messagesFor(locale).createGame.price.amount(
    formatMajorUnitsFromFils(fils),
  );
}

/** A Booking price always shows its amount, so zero reads "0.000 BD". */
export function formatBookingPriceFils(fils: number, locale: Locale): string {
  return formatMajorUnitsWithCurrency(fils, locale);
}
