import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import { productDaysBetween, zonedParts } from "./product-timezone";

const RELATIVE_DAYS = 7;

/** `today`, `yesterday`, `3 days ago`, then `4 Oct` after a week. */
export function formatPastDay(
  value: Date | string,
  locale: Locale,
  now: Date = new Date(),
) {
  const m = messagesFor(locale).group.pastDay;
  const date = value instanceof Date ? value : new Date(value);
  const daysAgo = productDaysBetween(date, now);
  if (daysAgo <= 0) {
    return m.today;
  }
  if (daysAgo === 1) {
    return m.yesterday;
  }
  if (daysAgo < RELATIVE_DAYS) {
    return m.daysAgo(daysAgo);
  }
  return formatDayMonth(date, locale, {
    year: zonedParts(date).year !== zonedParts(now).year,
  });
}

/** `Requested today`, `Requested 3 days ago`, then `Requested 4 Oct` after a week. */
export function formatRequestedAt(
  requestedAt: Date | string,
  locale: Locale,
  now: Date = new Date(),
) {
  return messagesFor(locale).group.pastDay.requested(
    formatPastDay(requestedAt, locale, now),
  );
}

/**
 * The meta line under every approve/reject request row: what the row needs to
 * say about the request, then when it was made, joined with ` · `.
 */
export function requestRowMeta(
  requestedAt: Date | string,
  locale: Locale,
  details: readonly (string | null | undefined)[] = [],
  now?: Date,
) {
  return [...details, formatRequestedAt(requestedAt, locale, now)]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}
