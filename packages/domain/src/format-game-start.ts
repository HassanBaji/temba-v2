/**
 * Every date and time in the App is written through these formatters so a
 * card and the hero never disagree ("7:30 PM" vs "19:30"). The Intl locale
 * comes from `intlLocale(locale)`: a 12-hour clock and the language's own day
 * and month names. Dates are still composed day before month (`Sat 4 Oct`),
 * which en-US would reverse.
 */

import { latinDigits } from "@repo/i18n/digits";
import { intlLocale, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gameDayStart } from "./game-day";
import {
  PRODUCT_TIMEZONE,
  productDaysBetween,
  zonedParts,
} from "./product-timezone";

type NameStyle = "short" | "long";

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export function formatWeekday(
  value: Date | string,
  style: NameStyle,
  locale: Locale,
) {
  return latinDigits(
    asDate(value).toLocaleDateString(intlLocale(locale), {
      weekday: style,
      numberingSystem: "latn",
      timeZone: PRODUCT_TIMEZONE,
    }),
  );
}

export function formatMonth(
  value: Date | string,
  style: NameStyle,
  locale: Locale,
) {
  return latinDigits(
    asDate(value).toLocaleDateString(intlLocale(locale), {
      month: style,
      numberingSystem: "latn",
      timeZone: PRODUCT_TIMEZONE,
    }),
  );
}

/** `4 Oct`, `Sat 4 Oct`, `Saturday 4 October 2026`. */
export function formatDayMonth(
  value: Date | string,
  locale: Locale,
  options: { weekday?: NameStyle; month?: NameStyle; year?: boolean } = {},
) {
  const date = asDate(value);
  const { day, year } = zonedParts(date);
  const parts = [
    options.weekday ? formatWeekday(date, options.weekday, locale) : null,
    String(day),
    formatMonth(date, options.month ?? "short", locale),
    options.year ? String(year) : null,
  ];
  return parts.filter((part) => part != null).join(" ");
}

/** The day a Game is listed under: a midnight start still belongs to the evening before. */
export function formatGameDay(
  startTime: Date | string,
  locale: Locale,
  options: { weekday?: NameStyle; month?: NameStyle; year?: boolean } = {},
) {
  return formatDayMonth(gameDayStart(asDate(startTime)), locale, options);
}

export function formatGameStart(startTime: Date | string, locale: Locale) {
  return messagesFor(locale).dates.gameStart(
    formatGameDay(startTime, locale, { weekday: "short" }),
    formatGameClock(startTime, locale),
  );
}

export function formatGameClock(startTime: Date | string, locale: Locale) {
  return latinDigits(
    asDate(startTime).toLocaleTimeString(intlLocale(locale), {
      hour: "numeric",
      minute: "2-digit",
      numberingSystem: "latn",
      timeZone: PRODUCT_TIMEZONE,
    }),
  );
}

export function formatDurationInMinutes(
  startTime: Date,
  endTime: Date,
  locale: Locale,
): string {
  const duration = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(duration / (1000 * 60)).toString();
  return messagesFor(locale).dates.minutesCompact(minutes);
}

export function formatWindowDuration(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
  locale: Locale,
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
  return messagesFor(locale).dates.windowDuration(minutes);
}

export function formatGameTimeWindow(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
  startTime: Date | string,
  locale: Locale,
) {
  if (windowStart && windowEnd) {
    return messagesFor(locale).dates.timeWindow(
      formatGameClock(windowStart, locale),
      formatGameClock(windowEnd, locale),
    );
  }
  return formatGameClock(startTime, locale);
}

function daysUntilGameDay(date: Date) {
  return productDaysBetween(new Date(), gameDayStart(date));
}

export type GameDayProximity = "today" | "tomorrow" | "later";

/** Lets cards tint the day label without re-parsing the relative-day copy. */
export function gameDayProximity(startTime: Date | string): GameDayProximity {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilGameDay(date);

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
  locale: Locale,
  options?: { sameDayLabel?: "Tonight" | "Today" },
) {
  const m = messagesFor(locale);
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilGameDay(date);

  if (diffDays === 0) {
    return options?.sameDayLabel === "Today" ? m.common.today : m.dates.tonight;
  }
  if (diffDays === 1) {
    return m.common.tomorrow;
  }

  return formatGameDay(date, locale, { weekday: "short" });
}

/** Detail headings: `Saturday 4 October`. */
export function formatAbsoluteDay(startTime: Date | string, locale: Locale) {
  return formatGameDay(startTime, locale, { weekday: "long", month: "long" });
}

/** Hub Game card day: Today / Tomorrow / `Thursday 11 Sep`. */
export function formatGameCardDay(startTime: Date | string, locale: Locale) {
  const m = messagesFor(locale);
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilGameDay(date);

  if (diffDays === 0) {
    return m.common.today;
  }
  if (diffDays === 1) {
    return m.common.tomorrow;
  }

  return formatGameDay(date, locale, { weekday: "long" });
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
export function formatGameClockWithoutMeridiem(
  time: Date | string,
  locale: Locale,
) {
  return stripMeridiem(formatGameClock(time, locale));
}

/**
 * Relative-past phrasing for a Friendly game's "Needs a score" hero
 * (game-details redesign, TEM-179): "Played today" / "Played 1 day ago" /
 * "Played N days ago". Every other relative-day helper in this module is
 * relative-future (`formatRelativeDay`) — this is the past-facing mirror,
 * reusing the same local-day math.
 */
export function formatPlayedRelativeDay(
  startTime: Date | string,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const daysAgo = -daysUntilGameDay(date);

  if (daysAgo <= 0) {
    return m.dates.playedToday;
  }
  return m.dates.playedDaysAgo(daysAgo);
}
