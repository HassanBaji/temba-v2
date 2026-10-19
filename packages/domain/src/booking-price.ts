import { zonedParts } from "./product-timezone";

export type PricingRuleInput = {
  courtId: string | null;
  weekdays: readonly number[];
  startMinutes: number;
  endMinutes: number;
  hourlyRateFils: number;
};

export type BookingPrice = { fils: number } | { uncovered: true };

const MINUTES_PER_DAY = 1440;
const MS_PER_MINUTE = 60_000;

function covers(rule: PricingRuleInput, weekday: number, minuteOfDay: number) {
  if (
    rule.weekdays.includes(weekday) &&
    minuteOfDay >= rule.startMinutes &&
    minuteOfDay < rule.endMinutes
  ) {
    return true;
  }
  const previousWeekday = (weekday + 6) % 7;
  const sincePreviousMidnight = minuteOfDay + MINUTES_PER_DAY;
  return (
    rule.weekdays.includes(previousWeekday) &&
    sincePreviousMidnight >= rule.startMinutes &&
    sincePreviousMidnight < rule.endMinutes
  );
}

/**
 * A window that runs past midnight prices on the weekday it opened on. The
 * product timezone has no daylight saving, so the wall clock advances one
 * minute per minute from the interval's start.
 */
export function priceForInterval(
  rules: readonly PricingRuleInput[],
  interval: { courtId: string; startsAt: Date; endsAt: Date },
): BookingPrice {
  const minutes = Math.floor(
    (interval.endsAt.getTime() - interval.startsAt.getTime()) / MS_PER_MINUTE,
  );
  if (minutes <= 0) {
    return { uncovered: true };
  }

  const courtRules = rules.filter((rule) => rule.courtId === interval.courtId);
  const venueRules = rules.filter((rule) => rule.courtId === null);

  const start = zonedParts(interval.startsAt);
  const startWeekday = new Date(
    Date.UTC(start.year, start.month - 1, start.day),
  ).getUTCDay();
  const startMinuteOfDay = start.hour * 60 + start.minute;

  let rateMinutes = 0;
  for (let offset = 0; offset < minutes; offset += 1) {
    const elapsed = startMinuteOfDay + offset;
    const weekday = (startWeekday + Math.floor(elapsed / MINUTES_PER_DAY)) % 7;
    const minuteOfDay = elapsed % MINUTES_PER_DAY;
    const rule =
      courtRules.find((candidate) => covers(candidate, weekday, minuteOfDay)) ??
      venueRules.find((candidate) => covers(candidate, weekday, minuteOfDay));
    if (!rule) {
      return { uncovered: true };
    }
    rateMinutes += rule.hourlyRateFils;
  }

  return { fils: Math.round(rateMinutes / 60) };
}
