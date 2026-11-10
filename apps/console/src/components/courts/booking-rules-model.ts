import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** `Up to the start`, `30 min before`, `2h before`: the design's Last minute line. */
export function describeLeadTime(minLeadMinutes: number, locale: Locale) {
  const m = messagesFor(locale).consoleCourts.rules;
  if (minLeadMinutes <= 0) {
    return m.upToStart;
  }
  if (minLeadMinutes % 60 === 0) {
    return m.hoursBefore(minLeadMinutes / 60);
  }
  return m.minutesBefore(minLeadMinutes);
}

export function describeHorizon(bookingHorizonDays: number, locale: Locale) {
  return messagesFor(locale).consoleCourts.rules.horizon(bookingHorizonDays);
}
