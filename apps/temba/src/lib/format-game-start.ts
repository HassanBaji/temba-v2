export function formatGameStart(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatGameClock(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatGameTimeWindow(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
  startTime: Date | string,
) {
  if (windowStart && windowEnd) {
    return `${formatGameClock(windowStart)} - ${formatGameClock(windowEnd)}`;
  }
  return formatGameClock(startTime);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysUntilLocalDay(date: Date) {
  const today = startOfLocalDay(new Date());
  const target = startOfLocalDay(date);
  return Math.round((target.getTime() - today.getTime()) / MS_PER_DAY);
}

export type GameDayProximity = "today" | "tomorrow" | "later";

/** Lets cards tint the day label without re-parsing the relative-day copy. */
export function gameDayProximity(startTime: Date | string): GameDayProximity {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilLocalDay(date);

  if (diffDays === 0) {
    return "today";
  }
  if (diffDays === 1) {
    return "tomorrow";
  }
  return "later";
}

export function formatRelativeDay(
  startTime: Date | string,
  options?: { sameDayLabel?: "Tonight" | "Today" },
) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilLocalDay(date);

  if (diffDays === 0) {
    return options?.sameDayLabel ?? "Tonight";
  }
  if (diffDays === 1) {
    return "Tomorrow";
  }

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function formatAbsoluteDay(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
