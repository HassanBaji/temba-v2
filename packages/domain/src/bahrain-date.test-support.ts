import { zonedDateTimeToInstant, zonedParts } from "./product-timezone";

/** `new Date(year, monthIndex, day, hour, minute, second)` read on the Bahrain wall clock. */
export function bahrainDate(
  year: number,
  monthIndex: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  return zonedDateTimeToInstant({
    year,
    month: monthIndex + 1,
    day,
    hour,
    minute,
    second,
  });
}

export function bahrainDayFromToday(offsetDays: number, hour = 12) {
  const { year, month, day } = zonedParts(new Date());
  return zonedDateTimeToInstant({
    year,
    month,
    day: day + offsetDays,
    hour,
  });
}
