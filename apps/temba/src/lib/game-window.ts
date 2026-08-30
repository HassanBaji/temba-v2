const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_PATTERN = /^(\d{2}):(\d{2})(?::(\d{2}))?$/;

function pad(value: number) {
  return String(value).padStart(2, "0");
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
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function parseDateInputValue(day: string): Date | undefined {
  const dateMatch = DATE_PATTERN.exec(day.trim());
  if (!dateMatch) {
    return undefined;
  }
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const dayOfMonth = Number(dateMatch[3]);
  const date = new Date(year, month - 1, dayOfMonth);
  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== dayOfMonth
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
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
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
  const combined = new Date(
    year,
    month - 1,
    dayOfMonth,
    hours,
    minutes,
    seconds,
  );
  if (
    Number.isNaN(combined.getTime()) ||
    combined.getFullYear() !== year ||
    combined.getMonth() !== month - 1 ||
    combined.getDate() !== dayOfMonth ||
    combined.getHours() !== hours ||
    combined.getMinutes() !== minutes ||
    combined.getSeconds() !== seconds
  ) {
    return undefined;
  }
  return combined;
}

export function parseRequiredGameWindow(
  day: string,
  startTime: string,
  finishTime: string,
): { windowStart: Date; windowEnd: Date } | undefined {
  const windowStart = combineDateAndTime(day, startTime);
  const windowEnd = combineDateAndTime(day, finishTime);
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
