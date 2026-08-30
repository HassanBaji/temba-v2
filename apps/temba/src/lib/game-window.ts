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

export function toDateInputValue(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) {
    return "";
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInputValue(value: Date | string | null | undefined) {
  const date = asDate(value);
  if (!date) {
    return "";
  }
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function combineDateAndTime(
  day: string,
  time: string,
): Date | undefined {
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
  if (Number.isNaN(combined.getTime())) {
    return undefined;
  }
  return combined;
}

export function parseRequiredGameWindow(
  day: string,
  startTime: string,
  finishTime: string,
) {
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
) {
  const start = asDate(windowStart);
  const end = asDate(windowEnd);
  const daySource = start ?? end;
  return {
    day: toDateInputValue(daySource),
    startTime: toTimeInputValue(start),
    finishTime: toTimeInputValue(end),
  };
}
