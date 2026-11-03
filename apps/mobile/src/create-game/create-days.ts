import {
  createDayChipLabel,
  createFlowDayOptions,
  dayChipValue,
} from "@repo/domain/create-game-flow";
import { formatMonth } from "@repo/domain/format-game-start";
import { formatDayLabel } from "@repo/domain/game-window";
import { zonedParts } from "@repo/domain/product-timezone";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { gridRows } from "./grid-rows";

export const DAY_STRIP_COUNT = 5;

export const WEEK_LENGTH = 7;

const MONTH_PATTERN = /^(\d{4})-(\d{2})$/;

/** Sunday first, matching the month grid's columns. */
export function weekdayInitials(locale: Locale): readonly string[] {
  const m = messagesFor(locale).mobileCreateGame.day.weekdayInitials;
  return [m.sun, m.mon, m.tue, m.wed, m.thu, m.fri, m.sat];
}

export type DayStripCell = {
  value: string;
  weekday: string;
  date: number;
};

export type VisibleDays = {
  cells: DayStripCell[];
  laterLabel: string | null;
};

export function visibleDayOptions(
  now: Date,
  selectedDay: string,
  locale: Locale,
): VisibleDays {
  const cells = createFlowDayOptions(now, DAY_STRIP_COUNT).map((option) => ({
    value: dayChipValue(option),
    weekday: createDayChipLabel(option, now, locale),
    date: zonedParts(option).day,
  }));
  const inStrip = cells.some((cell) => cell.value === selectedDay);
  return {
    cells,
    laterLabel:
      inStrip || !selectedDay ? null : formatDayLabel(selectedDay, locale),
  };
}

export type MonthGridCell = {
  value: string;
  date: number;
  disabled: boolean;
};

export type MonthGrid = {
  month: string;
  label: string;
  weeks: (MonthGridCell | null)[][];
  previous: string | null;
  next: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function monthParts(month: string) {
  const match = MONTH_PATTERN.exec(month);
  if (!match) {
    return null;
  }
  const monthNumber = Number(match[2]);
  if (monthNumber < 1 || monthNumber > 12) {
    return null;
  }
  return { year: Number(match[1]), month: monthNumber };
}

export function monthOfDay(day: string) {
  return day.slice(0, 7);
}

export function shiftMonth(month: string, delta: number) {
  const parts = monthParts(month);
  if (!parts) {
    return month;
  }
  const date = new Date(Date.UTC(parts.year, parts.month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

export function dateSheetStartMonth(selectedDay: string, earliestDay: string) {
  return selectedDay && selectedDay >= earliestDay
    ? monthOfDay(selectedDay)
    : monthOfDay(earliestDay);
}

export function monthGrid(
  month: string,
  earliestDay: string,
  locale: Locale,
): MonthGrid {
  const parts = monthParts(month) ?? monthParts(monthOfDay(earliestDay));
  if (!parts) {
    return { month, label: month, weeks: [], previous: null, next: month };
  }
  const key = `${parts.year}-${pad(parts.month)}`;
  const first = new Date(Date.UTC(parts.year, parts.month - 1, 1));
  const leading = first.getUTCDay();
  const length = new Date(Date.UTC(parts.year, parts.month, 0)).getUTCDate();
  const cells: (MonthGridCell | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length }, (_, index) => {
      const value = `${key}-${pad(index + 1)}`;
      return { value, date: index + 1, disabled: value < earliestDay };
    }),
  ];
  return {
    month: key,
    label: messagesFor(locale).mobileCreateGame.day.monthYear(
      formatMonth(first, "long", locale),
      parts.year,
    ),
    weeks: gridRows(cells, WEEK_LENGTH),
    previous: key > monthOfDay(earliestDay) ? shiftMonth(key, -1) : null,
    next: shiftMonth(key, 1),
  };
}
