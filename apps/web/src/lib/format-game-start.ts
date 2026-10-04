/**
 * The one locale every date and time in the App is written in, so a card and
 * the hero never disagree ("7:30 PM" vs "19:30"). en-US was already the most
 * used; it gives a 12-hour clock and English day and month names. Dates are
 * still composed day before month (`Sat 4 Oct`), which en-US would reverse.
 */
export const APP_LOCALE = "en-US";

import {
  PRODUCT_TIMEZONE,
  productDaysBetween,
  zonedParts,
} from "~/lib/product-timezone";

type NameStyle = "short" | "long";

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatWeekday(value: Date | string, style: NameStyle) {
  return asDate(value).toLocaleDateString(APP_LOCALE, {
    weekday: style,
    timeZone: PRODUCT_TIMEZONE,
  });
}

export function formatMonth(value: Date | string, style: NameStyle) {
  return asDate(value).toLocaleDateString(APP_LOCALE, {
    month: style,
    timeZone: PRODUCT_TIMEZONE,
  });
}

/** `4 Oct`, `Sat 4 Oct`, `Saturday 4 October 2026`. */
export function formatDayMonth(
  value: Date | string,
  options: { weekday?: NameStyle; month?: NameStyle; year?: boolean } = {},
) {
  const date = asDate(value);
  const { day, year } = zonedParts(date);
  const parts = [
    options.weekday ? formatWeekday(date, options.weekday) : null,
    String(day),
    formatMonth(date, options.month ?? "short"),
    options.year ? String(year) : null,
  ];
  return parts.filter((part) => part != null).join(" ");
}

export function formatGameStart(startTime: Date | string) {
  return `${formatDayMonth(startTime, { weekday: "short" })}, ${formatGameClock(startTime)}`;
}

export function formatGameClock(startTime: Date | string) {
  return asDate(startTime).toLocaleTimeString(APP_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: PRODUCT_TIMEZONE,
  });
}

export function formatDurationInMinutes(
  startTime: Date,
  endTime: Date,
): string {
  const duration = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(duration / (1000 * 60)).toString();
  return `${minutes}m`;
}

export function formatWindowDuration(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
): string | null {
  if (!windowStart || !windowEnd) {
    return null;
  }
  const start =
    windowStart instanceof Date ? windowStart : new Date(windowStart);
  const end = windowEnd instanceof Date ? windowEnd : new Date(windowEnd);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return null;
  }
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

export function formatGameTimeWindow(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
  startTime: Date | string,
) {
  if (windowStart && windowEnd) {
    return `${formatGameClock(windowStart)} - ${formatGameClock(windowEnd)}`;
  }
  return formatGameClock(startTime);
}

function daysUntilProductDay(date: Date) {
  return productDaysBetween(new Date(), date);
}

export type GameDayProximity = "today" | "tomorrow" | "later";

/** Lets cards tint the day label without re-parsing the relative-day copy. */
export function gameDayProximity(startTime: Date | string): GameDayProximity {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilProductDay(date);

  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "tomorrow";
  }
  return "later";
}

export function formatRelativeDay(
  startTime: Date | string,
  options?: { sameDayLabel?: "Tonight" | "Today" },
) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilProductDay(date);

  if (diffDays === 0) {
    return options?.sameDayLabel ?? "Tonight";
  }
  if (diffDays === 1) {
    return "Tomorrow";
  }

  return formatDayMonth(date, { weekday: "short" });
}

/** Detail headings: `Saturday 4 October`. */
export function formatAbsoluteDay(startTime: Date | string) {
  return formatDayMonth(startTime, { weekday: "long", month: "long" });
}

/** Hub Game card day: Today / Tomorrow / `Thursday 11 Sep`. */
export function formatGameCardDay(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilProductDay(date);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Tomorrow";
  }

  return formatDayMonth(date, { weekday: "long" });
}

/**
 * Strips a trailing AM/PM off a locale clock string, e.g. `"10:30 PM"` ->
 * `"10:30"`. Game-details hero (TEM-179) composite time strings need the
 * bare clock digits without repeating the meridiem a second time.
 */
function stripMeridiem(clock: string) {
  const parts = clock.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : clock;
}

/** Bare clock digits with no AM/PM suffix, e.g. `"10:30"`. */
export function formatGameClockWithoutMeridiem(time: Date | string) {
  return stripMeridiem(formatGameClock(time));
}

/**
 * Relative-past phrasing for a Friendly game's "Needs a score" hero
 * (game-details redesign, TEM-179): "Played today" / "Played 1 day ago" /
 * "Played N days ago". Every other relative-day helper in this module is
 * relative-future (`formatRelativeDay`) — this is the past-facing mirror,
 * reusing the same local-day math.
 */
export function formatPlayedRelativeDay(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const daysAgo = -daysUntilProductDay(date);

  if (daysAgo <= 0) {
    return "Played today";
  }
  if (daysAgo === 1) {
    return "Played 1 day ago";
  }
  return `Played ${daysAgo} days ago`;
}
