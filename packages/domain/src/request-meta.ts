import { formatDayMonth } from "./format-game-start";
import { productDaysBetween, zonedParts } from "./product-timezone";

const RELATIVE_DAYS = 7;

/** `today`, `yesterday`, `3 days ago`, then `4 Oct` after a week. */
export function formatPastDay(value: Date | string, now: Date = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const daysAgo = productDaysBetween(date, now);
  if (daysAgo <= 0) {
    return "today";
  }
  if (daysAgo === 1) {
    return "yesterday";
  }
  if (daysAgo < RELATIVE_DAYS) {
    return `${daysAgo} days ago`;
  }
  return formatDayMonth(date, {
    year: zonedParts(date).year !== zonedParts(now).year,
  });
}

/** `Requested today`, `Requested 3 days ago`, then `Requested 4 Oct` after a week. */
export function formatRequestedAt(
  requestedAt: Date | string,
  now: Date = new Date(),
) {
  return `Requested ${formatPastDay(requestedAt, now)}`;
}

/**
 * The meta line under every approve/reject request row: what the row needs to
 * say about the request, then when it was made, joined with ` · `.
 */
export function requestRowMeta(
  requestedAt: Date | string,
  details: readonly (string | null | undefined)[] = [],
  now?: Date,
) {
  return [...details, formatRequestedAt(requestedAt, now)]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
}
