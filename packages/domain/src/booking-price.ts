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
 * The rule covering the start time prices the whole interval, even when the
 * interval runs into another rule's window or past every rule's end. A window
 * that runs past midnight prices on the weekday it opened on.
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

  const start = zonedParts(interval.startsAt);
  const weekday = new Date(
    Date.UTC(start.year, start.month - 1, start.day),
  ).getUTCDay();
  const minuteOfDay = start.hour * 60 + start.minute;
  const startCovers = (rule: PricingRuleInput) =>
    covers(rule, weekday, minuteOfDay);

  const rule =
    rules.find(
      (candidate) =>
        candidate.courtId === interval.courtId && startCovers(candidate),
    ) ??
    rules.find(
      (candidate) => candidate.courtId === null && startCovers(candidate),
    );
  if (!rule) {
    return { uncovered: true };
  }

  return { fils: Math.round((rule.hourlyRateFils * minutes) / 60) };
}
