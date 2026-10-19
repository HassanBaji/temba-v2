export const WEEKDAY_ORDER = [0, 1, 2, 3, 4, 5, 6] as const;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const MAX_CLOSES_AT_MINUTES = 1800;

export type HoursWindow = { opensAtMinutes: number; closesAtMinutes: number };

export function formatMinutes(minutes: number) {
  const day = Math.floor(minutes / 1440);
  const inDay = minutes % 1440;
  const clock = `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
  return day > 0 ? `${clock} (next day)` : clock;
}

/** `7:00 AM`, `11:30 PM`; minutes past midnight wrap onto the next day's clock. */
export function formatClock(minutes: number) {
  const inDay = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(inDay / 60);
  const minute = inDay % 60;
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

export function timeOptions(slotMinutes: number, from = 0) {
  const options: { value: number; label: string }[] = [];
  for (
    let minutes = from;
    minutes <= MAX_CLOSES_AT_MINUTES;
    minutes += slotMinutes
  ) {
    options.push({ value: minutes, label: formatClock(minutes) });
  }
  return options;
}

/** Open hours in a day, summed over its windows: `16h`, `16.5h`. */
export function formatOpenHours(windows: HoursWindow[]) {
  const minutes = windows.reduce(
    (total, window) =>
      total + Math.max(0, window.closesAtMinutes - window.opensAtMinutes),
    0,
  );
  const hours = minutes / 60;
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)}h`;
}

export function hoursAreEqual(a: HoursWindow[], b: HoursWindow[]) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function nextWindowAfter(
  windows: HoursWindow[],
  slotMinutes: number,
): HoursWindow {
  const last = windows[windows.length - 1];
  if (!last) {
    return { opensAtMinutes: 9 * 60, closesAtMinutes: 22 * 60 };
  }
  const opens = Math.min(
    last.closesAtMinutes + slotMinutes,
    MAX_CLOSES_AT_MINUTES - slotMinutes,
  );
  return {
    opensAtMinutes: opens,
    closesAtMinutes: Math.min(opens + 4 * 60, MAX_CLOSES_AT_MINUTES),
  };
}

export function windowsProblem(
  windows: HoursWindow[],
  slotMinutes: number,
): string | null {
  for (const window of windows) {
    if (window.closesAtMinutes <= window.opensAtMinutes) {
      return "Closing time must be after opening time";
    }
    if (
      window.opensAtMinutes % slotMinutes !== 0 ||
      window.closesAtMinutes % slotMinutes !== 0
    ) {
      return `Times must fall on the ${slotMinutes}-minute grid`;
    }
  }
  const sorted = [...windows].sort(
    (a, b) => a.opensAtMinutes - b.opensAtMinutes,
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index]!.opensAtMinutes < sorted[index - 1]!.closesAtMinutes) {
      return "Opening windows on the same day must not overlap";
    }
  }
  return null;
}

export function productDateTimeInputToInstant(
  value: string,
  toInstant: (parts: {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  }) => Date,
): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute] = match.map(Number) as [
    number,
    number,
    number,
    number,
    number,
    number,
  ];
  return toInstant({ year, month, day, hour, minute });
}
