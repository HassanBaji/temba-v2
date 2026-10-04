import {
  formatDayMonth,
  formatGameClock,
  formatWeekday,
} from "./format-game-start";
import {
  addProductDays,
  startOfProductDay,
  zonedDateTimeToInstant,
  zonedParts,
} from "./product-timezone";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;
const LAST_SLOT_MINUTES = 23 * 60 + 30;

export const GAME_WINDOW_TIME_STEP_MINUTES = 30;

export const GAME_WINDOW_TIME_SLOTS: readonly string[] = Array.from(
  { length: (24 * 60) / GAME_WINDOW_TIME_STEP_MINUTES },
  (_, index) => {
    const minutes = index * GAME_WINDOW_TIME_STEP_MINUTES;
    return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
  },
);

function pad(value: number) {
  return String(value).padStart(2, "0");
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

function toDateInputValue(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) {
    return "";
  }
  return formatDateInputValue(date);
}

function toTimeInputValue(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) {
    return "";
  }
  const { hour, minute } = zonedParts(date);
  return snapTimeInputValue(`${pad(hour)}:${pad(minute)}`);
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
  const clamped = Math.min(Math.max(snapped, 0), LAST_SLOT_MINUTES);
  return `${pad(Math.floor(clamped / 60))}:${pad(clamped % 60)}`;
}

export function formatDayLabel(day: string) {
  const date = parseDateInputValue(day);
  if (!date) {
    return null;
  }
  return formatDayMonth(date, { weekday: "short", year: true });
}

export function formatTimeSlotLabel(time: string) {
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
  );
}

export function formatGameWindowName(
  day: string,
  startTime: string,
  finishTime: string,
) {
  const date = parseDateInputValue(day);
  const weekday = date ? formatWeekday(date, "short") : day;
  return `${weekday} ${formatTimeSlotLabel(startTime)} - ${formatTimeSlotLabel(finishTime)}`;
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
  const combined = zonedDateTimeToInstant({
    year,
    month,
    day: dayOfMonth,
    hour: hours,
    minute: minutes,
    second: seconds,
  });
  const parts = zonedParts(combined);
  if (
    Number.isNaN(combined.getTime()) ||
    parts.year !== year ||
    parts.month !== month ||
    parts.day !== dayOfMonth ||
    parts.hour !== hours ||
    parts.minute !== minutes ||
    parts.second !== seconds
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
  return {
    day: toDateInputValue(daySource),
    startTime: toTimeInputValue(start),
    finishTime: toTimeInputValue(end),
  };
}
