import {
  formatDayMonth,
  formatGameClock,
  formatWeekday,
} from "@repo/domain/format-game-start";
import { productDaysBetween, zonedParts } from "@repo/domain/product-timezone";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type ClosureStatus = "active" | "scheduled";

export function closureStatus(startsAt: Date, now: Date): ClosureStatus {
  return startsAt.getTime() <= now.getTime() ? "active" : "scheduled";
}

/** `Court 3, resurfacing`; without a reason just the scope. */
export function closureTitle(
  scope: string,
  reason: string | null,
  locale: Locale,
) {
  return reason
    ? messagesFor(locale).consoleHours.closures.withReason(scope, reason)
    : scope;
}

function isMidnight(date: Date) {
  const { hour, minute } = zonedParts(date);
  return hour === 0 && minute === 0;
}

function relativeDay(
  date: Date,
  now: Date,
  style: "full" | "dayOnly",
  locale: Locale,
) {
  const m = messagesFor(locale).consoleHours.closures;
  const diff = productDaysBetween(now, date);
  if (diff === 0) {
    return m.today;
  }
  if (diff === 1) {
    return m.tomorrow;
  }
  return style === "full"
    ? formatDayMonth(date, locale, { weekday: "short" })
    : m.dayAndDate(formatWeekday(date, "short", locale), zonedParts(date).day);
}

/**
 * `Today, 7:00 AM to 5:00 PM`, `Wed 16 Dec, all day`,
 * `Fri 6 to Sat 7 Nov, 8:00 AM to 8:00 PM`. A Closure that ends on a
 * midnight is read as covering the day before it.
 */
export function describeClosureWindow(
  startsAt: Date,
  endsAt: Date,
  now: Date,
  locale: Locale,
) {
  const { consoleHours, consoleShell } = messagesFor(locale);
  const m = consoleHours.closures;
  const allDay = isMidnight(startsAt) && isMidnight(endsAt);
  const lastDay = allDay ? new Date(endsAt.getTime() - 60_000) : endsAt;
  const times = allDay
    ? m.allDay
    : consoleShell.clock.range(
        formatGameClock(startsAt, locale),
        formatGameClock(endsAt, locale),
      );
  if (productDaysBetween(startsAt, lastDay) <= 0) {
    return m.window(relativeDay(startsAt, now, "full", locale), times);
  }
  const start = zonedParts(startsAt);
  const last = zonedParts(lastDay);
  const sameMonth = start.month === last.month && start.year === last.year;
  const first = relativeDay(
    startsAt,
    now,
    sameMonth ? "dayOnly" : "full",
    locale,
  );
  return m.window(
    m.dayRange(first, relativeDay(lastDay, now, "full", locale)),
    times,
  );
}
