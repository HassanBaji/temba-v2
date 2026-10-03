export const PRICE_PER_PLAYER_MAX_CENTS = 100_000_000;

/** Display currency for price per player until a stored currency exists. */
export const PRICE_PER_PLAYER_CURRENCY = "BD";

export const PRICE_PER_PLAYER_FIELD_DESCRIPTION = `Optional. Amounts are in ${PRICE_PER_PLAYER_CURRENCY}. Up to two decimal places. Leave blank if unset. Zero means free. Temba does not collect payment.`;

export type ParsePricePerPlayerResult =
  | { ok: true; cents: number | null }
  | { ok: false; message: string };

const MAJOR_UNIT_PATTERN = /^\d+(?:\.\d{1,2})?$/;
const TOO_MANY_FRACTION_DIGITS = /^\d+\.\d{3,}$/;

export function parseOptionalPricePerPlayerCents(
  value: string,
): ParsePricePerPlayerResult {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: true, cents: null };
  }

  if (trimmed.startsWith("-")) {
    return { ok: false, message: "Price per player cannot be negative" };
  }

  if (!MAJOR_UNIT_PATTERN.test(trimmed)) {
    if (TOO_MANY_FRACTION_DIGITS.test(trimmed)) {
      return { ok: false, message: "Use up to two decimal places" };
    }
    return { ok: false, message: "Enter a valid amount" };
  }

  const dot = trimmed.indexOf(".");
  const wholeText = dot === -1 ? trimmed : trimmed.slice(0, dot);
  const fractionText = dot === -1 ? "" : trimmed.slice(dot + 1);
  const whole = Number(wholeText);
  const fraction = Number((fractionText + "00").slice(0, 2));
  const cents = whole * 100 + fraction;

  if (!Number.isSafeInteger(cents) || cents > PRICE_PER_PLAYER_MAX_CENTS) {
    return { ok: false, message: "Price per player is too large" };
  }

  return { ok: true, cents };
}

export function formatPricePerPlayerCents(
  cents: number | null | undefined,
): string | null {
  if (cents == null) {
    return null;
  }
  if (cents === 0) {
    return "Free";
  }
  return formatMajorUnitsWithCurrency(cents);
}

export function formatPricePerPlayerCardMeta(
  cents: number | null | undefined,
): string | null {
  if (cents == null) {
    return null;
  }
  if (cents === 0) {
    return "Free";
  }
  return `${formatMajorUnitsWithCurrency(cents)} / player`;
}

export function centsToMajorInput(cents: number | null | undefined): string {
  if (cents == null) {
    return "";
  }
  return formatMajorUnitsFromCents(cents);
}

function formatMajorUnitsFromCents(cents: number): string {
  const abs = cents < 0 ? -cents : cents;
  const whole = Math.trunc(abs / 100);
  const fraction = abs % 100;
  const body = `${whole}.${String(fraction).padStart(2, "0")}`;
  return cents < 0 ? `-${body}` : body;
}

function formatMajorUnitsWithCurrency(cents: number): string {
  return `${formatMajorUnitsFromCents(cents)} ${PRICE_PER_PLAYER_CURRENCY}`;
}
