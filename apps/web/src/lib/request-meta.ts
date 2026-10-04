import { formatDayMonth } from "~/lib/format-game-start";
import { productDaysBetween, zonedParts } from "~/lib/product-timezone";

const RELATIVE_DAYS = 7;

/** `Requested today`, `Requested 3 days ago`, then `Requested 4 Oct` after a week. */
export function formatRequestedAt(
  requestedAt: Date | string,
  now: Date = new Date(),
) {
  const date =
    requestedAt instanceof Date ? requestedAt : new Date(requestedAt);
  const daysAgo = productDaysBetween(date, now);
  if (daysAgo <= 0) {
    return "Requested today";
  }
  if (daysAgo === 1) {
    return "Requested yesterday";
  }
  if (daysAgo < RELATIVE_DAYS) {
    return `Requested ${daysAgo} days ago`;
  }
  return `Requested ${formatDayMonth(date, {
    year: zonedParts(date).year !== zonedParts(now).year,
  })}`;
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
