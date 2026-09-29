import { formatDayMonth } from "~/lib/format-game-start";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const RELATIVE_DAYS = 7;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** `Requested today`, `Requested 3 days ago`, then `Requested 4 Oct` after a week. */
export function formatRequestedAt(
  requestedAt: Date | string,
  now: Date = new Date(),
) {
  const date =
    requestedAt instanceof Date ? requestedAt : new Date(requestedAt);
  const daysAgo = Math.round(
    (startOfLocalDay(now).getTime() - startOfLocalDay(date).getTime()) /
      MS_PER_DAY,
  );
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
    year: date.getFullYear() !== now.getFullYear(),
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
