import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  formatDayMonth,
  formatGameClock,
  formatWeekday,
} from "./format-game-start";
import {
  GAME_DAY_LAST_FINISH_MINUTES,
  GAME_DAY_MINUTES,
  gameDayStart,
  minutesIntoGameDay,
} from "./game-day";
import {
  addProductDays,
  startOfProductDay,
  zonedDateTimeToInstant,
  zonedParts,
} from "./product-timezone";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

export const GAME_WINDOW_TIME_STEP_MINUTES = 30;

/**
 * Slots are wall-clock minutes from the picked day's midnight, written
 * `HH:MM`. A day's Games start from 00:30 up to 24:00, the midnight that
 * closes it (`gameDayStart`), and may finish past that midnight, so finish
 * slots run on to `GAME_DAY_LAST_FINISH_MINUTES` and read `25:30` for 1:30 AM.
 */
function slotRange(fromMinutes: number, toMinutes: number): readonly string[] {
  const slots: string[] = [];
  for (
    let minutes = fromMinutes;
    minutes <= toMinutes;
    minutes += GAME_WINDOW_TIME_STEP_MINUTES
  ) {
    slots.push(timeSlotFromMinutes(minutes));
  }
  return slots;
}

export const GAME_WINDOW_TIME_SLOTS: readonly string[] = slotRange(
  GAME_WINDOW_TIME_STEP_MINUTES,
  GAME_DAY_MINUTES,
);

export const GAME_WINDOW_FINISH_SLOTS: readonly string[] = slotRange(
  GAME_WINDOW_TIME_STEP_MINUTES,
  GAME_DAY_LAST_FINISH_MINUTES,
);

export type FinishAtStart = "allowed" | "blocked";

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function timeSlotFromMinutes(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function timeSlotMinutes(slot: string): number | null {
  const timeMatch = TIME_PATTERN.exec(slot.trim());
  if (!timeMatch) {
    return null;
  }
  return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
}

/** Finish slots a Game starting at `startTime` may pick. */
export function gameWindowFinishSlots(
  startTime: string,
  finishAtStart: FinishAtStart = "blocked",
): readonly string[] {
  if (!startTime) {
    return GAME_WINDOW_FINISH_SLOTS;
  }
  return GAME_WINDOW_FINISH_SLOTS.filter((slot) =>
    finishAtStart === "allowed" ? slot >= startTime : slot > startTime,
  );
}

/** Finish slots for the picker: the start's finish slots, or the day's upcoming starts until one is picked. */
export function upcomingGameWindowFinishSlots(
  day: string,
  startTime: string,
  now: Date = new Date(),
  finishAtStart: FinishAtStart = "blocked",
): readonly string[] {
  const starts = upcomingGameWindowTimeSlots(day, now);
  if (!startTime || !starts.includes(startTime)) {
    return starts;
  }
  return gameWindowFinishSlots(startTime, finishAtStart);
}

export function upcomingGameWindowTimeSlots(
  day: string,
  now: Date = new Date(),
): readonly string[] {
  const selected = parseDateInputValue(day);
  if (!selected) {
    return GAME_WINDOW_TIME_SLOTS;
  }
  const today = startOfProductDay(now);
  if (selected.getTime() > today.getTime()) {
    return GAME_WINDOW_TIME_SLOTS;
  }
  if (selected.getTime() < today.getTime()) {
    return [];
  }
  return GAME_WINDOW_TIME_SLOTS.filter((slot) => {
    const slotDate = combineDateAndTime(day, slot);
    return slotDate !== undefined && slotDate.getTime() > now.getTime();
  });
}

export function earliestGameWindowDay(now: Date = new Date()) {
  const today = startOfProductDay(now);
  const todaySlots = upcomingGameWindowTimeSlots(
    formatDateInputValue(today),
    now,
  );
  if (todaySlots.length > 0) {
    return today;
  }
  return addProductDays(today, 1);
}

function asDate(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export function formatDateInputValue(date: Date) {
  const { year, month, day } = zonedParts(date);
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function parseDateInputValue(day: string): Date | undefined {
  const dateMatch = DATE_PATTERN.exec(day.trim());
  if (!dateMatch) {
    return undefined;
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const dayOfMonth = Number(dateMatch[3]);
  const date = zonedDateTimeToInstant({ year, month, day: dayOfMonth });
  const parts = zonedParts(date);
  if (
    Number.isNaN(date.getTime()) ||
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== dayOfMonth
  ) {
    return undefined;
  }
  return date;
}

function toTimeInputValue(dayStart: Date, value: Date | null) {
  if (!value) {
    return "";
  }
  const minutes = Math.max(0, minutesIntoGameDay(dayStart, value));
  return snapTimeInputValue(timeSlotFromMinutes(minutes));
}

export function snapTimeInputValue(time: string): string {
  const trimmed = time.trim();
  if (trimmed.length === 0) {
    return "";
  }
  const timeMatch = TIME_PATTERN.exec(trimmed);
  if (!timeMatch) {
    return time;
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const totalMinutes = hours * 60 + minutes;
  const snapped =
    Math.round(totalMinutes / GAME_WINDOW_TIME_STEP_MINUTES) *
    GAME_WINDOW_TIME_STEP_MINUTES;
  return timeSlotFromMinutes(Math.max(snapped, 0));
}

export function formatDayLabel(day: string, locale: Locale) {
  const date = parseDateInputValue(day);
  if (!date) {
    return null;
  }
  return formatDayMonth(date, locale, { weekday: "short", year: true });
}

export function formatTimeSlotLabel(time: string, locale: Locale) {
  const snapped = snapTimeInputValue(time);
  const timeMatch = TIME_PATTERN.exec(snapped);
  if (!timeMatch) {
    return time;
  }
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  return formatGameClock(
    zonedDateTimeToInstant({
      year: 2000,
      month: 1,
      day: 1,
      hour: hours,
      minute: minutes,
    }),
    locale,
  );
}

export function formatGameWindowName(
  day: string,
  startTime: string,
  finishTime: string,
  locale: Locale,
) {
  const date = parseDateInputValue(day);
  const weekday = date ? formatWeekday(date, "short", locale) : day;
  return messagesFor(locale).game.window.name(
    weekday,
    formatTimeSlotLabel(startTime, locale),
    formatTimeSlotLabel(finishTime, locale),
  );
}

function combineDateAndTime(day: string, time: string): Date | undefined {
  const dateMatch = DATE_PATTERN.exec(day.trim());
  const timeMatch = TIME_PATTERN.exec(time.trim());
  if (!dateMatch || !timeMatch) {
    return undefined;
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const dayOfMonth = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  const seconds = Number(timeMatch[3] ?? 0);
  const calendarDay = new Date(Date.UTC(year, month - 1, dayOfMonth));
  if (
    calendarDay.getUTCFullYear() !== year ||
    calendarDay.getUTCMonth() + 1 !== month ||
    calendarDay.getUTCDate() !== dayOfMonth
  ) {
    return undefined;
  }
  const combined = zonedDateTimeToInstant({
    year,
    month,
    day: dayOfMonth,
    hour: hours,
    minute: minutes,
    second: seconds,
  });
  // Hours of 24 and more roll into the next day; the wall clock must agree.
  const expected = new Date(
    Date.UTC(year, month - 1, dayOfMonth, hours, minutes, seconds),
  );
  const parts = zonedParts(combined);
  if (
    Number.isNaN(combined.getTime()) ||
    parts.year !== expected.getUTCFullYear() ||
    parts.month !== expected.getUTCMonth() + 1 ||
    parts.day !== expected.getUTCDate() ||
    parts.hour !== expected.getUTCHours() ||
    parts.minute !== expected.getUTCMinutes() ||
    parts.second !== expected.getUTCSeconds()
  ) {
    return undefined;
  }
  return combined;
}

export function parseGameDateTime(day: string, time: string): Date | undefined {
  return combineDateAndTime(day, snapTimeInputValue(time));
}

export function parseRequiredGameWindow(
  day: string,
  startTime: string,
  finishTime: string,
): { windowStart: Date; windowEnd: Date } | undefined {
  const windowStart = parseGameDateTime(day, startTime);
  const windowEnd = parseGameDateTime(day, finishTime);
  if (!windowStart || !windowEnd) {
    return undefined;
  }
  return { windowStart, windowEnd };
}

export function splitGameWindow(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
): { day: string; startTime: string; finishTime: string } {
  const start = asDate(windowStart);
  const end = asDate(windowEnd);
  const daySource = start ?? end;
  if (!daySource) {
    return { day: "", startTime: "", finishTime: "" };
  }
  const dayStart = gameDayStart(daySource);
  return {
    day: formatDateInputValue(dayStart),
    startTime: toTimeInputValue(dayStart, start),
    finishTime: toTimeInputValue(dayStart, end),
  };
}

export function gameEditWindowChoices(
  current: { day: string; startTime: string; finishTime: string },
  now: Date = new Date(),
  dayCount = 14,
) {
  const first = earliestGameWindowDay(now);
  const days = Array.from({ length: dayCount }, (_, index) =>
    formatDateInputValue(addProductDays(first, index)),
  );
  if (current.day && !days.includes(current.day)) {
    days.unshift(current.day);
  }
  const withCurrent = (slots: readonly string[], keep: string) =>
    keep && !slots.includes(keep) ? [...slots, keep].sort() : [...slots];
  const startSlots = withCurrent(
    upcomingGameWindowTimeSlots(current.day, now),
    current.startTime,
  );
  const finishSlots = withCurrent(
    current.startTime ? gameWindowFinishSlots(current.startTime) : startSlots,
    current.finishTime,
  );
  return { days, startSlots, finishSlots };
}
