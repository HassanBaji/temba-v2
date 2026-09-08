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

export function formatDurationInMinutes(
  startTime: Date,
  endTime: Date,
): string {
  const duration = endTime.getTime() - startTime.getTime();
  const minutes = Math.floor(duration / (1000 * 60)).toString();
  return `${minutes}m`;
}

export function formatWindowDuration(
  windowStart: Date | string | null | undefined,
  windowEnd: Date | string | null | undefined,
): string | null {
  if (!windowStart || !windowEnd) {
    return null;
  }
  const start =
    windowStart instanceof Date ? windowStart : new Date(windowStart);
  const end = windowEnd instanceof Date ? windowEnd : new Date(windowEnd);
  const minutes = Math.round((end.getTime() - start.getTime()) / 60_000);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return null;
  }
  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
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
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

/** Hub Game card day: Today / Tomorrow / `Thursday 11 Sep`. */
export function formatGameCardDay(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const diffDays = daysUntilLocalDay(date);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Tomorrow";
  }

  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday} ${day} ${month}`;
}

/**
 * Strips a trailing AM/PM off a locale clock string, e.g. `"10:30 PM"` ->
 * `"10:30"`. Game-details hero (TEM-179) composite time strings need the
 * bare clock digits without repeating the meridiem a second time.
 */
function stripMeridiem(clock: string) {
  const parts = clock.trim().split(/\s+/);
  return parts.length > 1 ? parts.slice(0, -1).join(" ") : clock;
}

/** Bare clock digits with no AM/PM suffix, e.g. `"10:30"`. */
export function formatGameClockWithoutMeridiem(time: Date | string) {
  return stripMeridiem(formatGameClock(time));
}

/**
 * Relative-past phrasing for a Friendly game's "Needs a score" hero
 * (game-details redesign, TEM-179): "Played today" / "Played 1 day ago" /
 * "Played N days ago". Every other relative-day helper in this module is
 * relative-future (`formatRelativeDay`) — this is the past-facing mirror,
 * reusing the same local-day math.
 */
export function formatPlayedRelativeDay(startTime: Date | string) {
  const date = startTime instanceof Date ? startTime : new Date(startTime);
  const daysAgo = -daysUntilLocalDay(date);

  if (daysAgo <= 0) {
    return "Played today";
  }
  if (daysAgo === 1) {
    return "Played 1 day ago";
  }
  return `Played ${daysAgo} days ago`;
}
