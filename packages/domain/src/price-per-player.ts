export const PRICE_PER_PLAYER_MAX_FILS = 1_000_000_000;

/** Display currency for price per player until a stored currency exists. */
export const PRICE_PER_PLAYER_CURRENCY = "BD";

export const PRICE_PER_PLAYER_FIELD_DESCRIPTION = `Optional. Amounts are in ${PRICE_PER_PLAYER_CURRENCY}. Up to three decimal places. Leave blank if unset. Zero means free. Temba does not collect payment.`;

export type ParsePricePerPlayerResult =
  | { ok: true; fils: number | null }
  | { ok: false; message: string };

const MAJOR_UNIT_PATTERN = /^\d+(?:\.\d{1,3})?$/;
const TOO_MANY_FRACTION_DIGITS = /^\d+\.\d{4,}$/;

export function parseOptionalPricePerPlayerFils(
  value: string,
): ParsePricePerPlayerResult {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, fils: null };
  }

  if (trimmed.startsWith("-")) {
    return { ok: false, message: "Price per player cannot be negative" };
  }

  if (!MAJOR_UNIT_PATTERN.test(trimmed)) {
    if (TOO_MANY_FRACTION_DIGITS.test(trimmed)) {
      return { ok: false, message: "Use up to three decimal places" };
    }
    return { ok: false, message: "Enter a valid amount" };
  }

  const dot = trimmed.indexOf(".");
  const wholeText = dot === -1 ? trimmed : trimmed.slice(0, dot);
  const fractionText = dot === -1 ? "" : trimmed.slice(dot + 1);
  const whole = Number(wholeText);
  const fraction = Number((fractionText + "000").slice(0, 3));
  const fils = whole * 1000 + fraction;

  if (!Number.isSafeInteger(fils) || fils > PRICE_PER_PLAYER_MAX_FILS) {
    return { ok: false, message: "Price per player is too large" };
  }

  return { ok: true, fils };
}

export function formatPricePerPlayerFils(
  fils: number | null | undefined,
): string | null {
  if (fils == null) {
    return null;
  }
  if (fils === 0) {
    return "Free";
  }
  return formatMajorUnitsWithCurrency(fils);
}

export function formatPricePerPlayerCardMeta(
  fils: number | null | undefined,
): string | null {
  if (fils == null) {
    return null;
  }
  if (fils === 0) {
    return "Free";
  }
  return `${formatMajorUnitsWithCurrency(fils)} / player`;
}

export function filsToMajorInput(fils: number | null | undefined): string {
  if (fils == null) {
    return "";
  }
  return formatMajorUnitsFromFils(fils);
}

function formatMajorUnitsFromFils(fils: number): string {
  const abs = fils < 0 ? -fils : fils;
  const whole = Math.trunc(abs / 1000);
  const fraction = abs % 1000;
  const body = `${whole}.${String(fraction).padStart(3, "0")}`;
  return fils < 0 ? `-${body}` : body;
}

function formatMajorUnitsWithCurrency(fils: number): string {
  return `${formatMajorUnitsFromFils(fils)} ${PRICE_PER_PLAYER_CURRENCY}`;
}
