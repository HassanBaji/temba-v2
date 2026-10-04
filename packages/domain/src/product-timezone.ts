export const PRODUCT_TIMEZONE = "Asia/Bahrain";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: PRODUCT_TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

export function zonedParts(date: Date): ZonedParts {
  const parts: Record<string, number> = {};
  for (const part of partsFormatter.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }
  return {
    year: parts.year ?? Number.NaN,
    month: parts.month ?? Number.NaN,
    day: parts.day ?? Number.NaN,
    hour: parts.hour ?? Number.NaN,
    minute: parts.minute ?? Number.NaN,
    second: parts.second ?? Number.NaN,
  };
}

function partsAsUtc(parts: ZonedParts) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
}

/** The instant at which the product timezone's wall clock reads these parts. */
export function zonedDateTimeToInstant(
  parts: Pick<ZonedParts, "year" | "month" | "day"> &
    Partial<Pick<ZonedParts, "hour" | "minute" | "second">>,
): Date {
  const wall = partsAsUtc({ hour: 0, minute: 0, second: 0, ...parts });
  let instant = wall;
  for (let pass = 0; pass < 2; pass += 1) {
    instant = wall - (partsAsUtc(zonedParts(new Date(instant))) - instant);
  }
  return new Date(instant);
}

export function startOfProductDay(date: Date): Date {
  const { year, month, day } = zonedParts(date);
  return zonedDateTimeToInstant({ year, month, day });
}

export function addProductDays(date: Date, days: number): Date {
  const { year, month, day } = zonedParts(date);
  return zonedDateTimeToInstant({ year, month, day: day + days });
}

/** Whole product-timezone days from `from` to `to`; negative when `to` is earlier. */
export function productDaysBetween(from: Date, to: Date): number {
  const a = zonedParts(from);
  const b = zonedParts(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) -
      Date.UTC(a.year, a.month - 1, a.day)) /
      MS_PER_DAY,
  );
}

export function productDayKey(date: Date): string {
  const { year, month, day } = zonedParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
