import {
  addProductDays,
  productDayKey,
  productDaysBetween,
  startOfProductDay,
  zonedParts,
} from "./product-timezone";

export const GAME_DAY_MINUTES = 24 * 60;

/** A Game picked on a day may run until 3:00 AM the next morning. */
export const GAME_DAY_LAST_FINISH_MINUTES = GAME_DAY_MINUTES + 3 * 60;

/**
 * Midnight of the day a Game belongs to. Late Games run into the next
 * calendar day, so a Game that starts exactly at midnight is still the
 * evening before's and is listed, picked and labelled under that day.
 */
export function gameDayStart(start: Date): Date {
  const { hour, minute, second } = zonedParts(start);
  if (hour === 0 && minute === 0 && second === 0) {
    return addProductDays(start, -1);
  }
  return startOfProductDay(start);
}

export function gameDayKey(start: Date): string {
  return productDayKey(gameDayStart(start));
}

/** Wall-clock minutes from the Game day's midnight; a midnight start reads 1440. */
export function minutesIntoGameDay(dayStart: Date, value: Date): number {
  const { hour, minute } = zonedParts(value);
  return (
    productDaysBetween(dayStart, value) * GAME_DAY_MINUTES + hour * 60 + minute
  );
}

export function gameDayMinutes(start: Date): number {
  return minutesIntoGameDay(gameDayStart(start), start);
}

/** Whether `end` still falls inside the Game day that `start` opens. */
export function endsInsideGameDay(start: Date, end: Date): boolean {
  return (
    minutesIntoGameDay(gameDayStart(start), end) <= GAME_DAY_LAST_FINISH_MINUTES
  );
}
