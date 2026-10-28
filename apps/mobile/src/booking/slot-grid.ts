import {
  formatGameClockWithoutMeridiem,
  formatWeekday,
} from "@repo/domain/format-game-start";
import {
  addProductDays,
  productDayKey,
  zonedDateTimeToInstant,
  zonedParts,
} from "@repo/domain/product-timezone";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;

export type OpeningWindow = { opensAtMinutes: number; closesAtMinutes: number };

export type AvailabilityCourt = {
  id: string;
  name: string;
  slots: {
    startsAt: Date;
    durations: { minutes: number; priceFils: number }[];
  }[];
};

export type StripDay = {
  key: string;
  weekday: string;
  dayOfMonth: number;
};

/** The days a Customer may book, today first. */
export function dayStrip(now: Date, horizonDays: number): StripDay[] {
  return Array.from({ length: Math.max(horizonDays, 0) }, (_, offset) => {
    const midnight = addProductDays(now, offset);
    return {
      key: productDayKey(midnight),
      weekday: offset === 0 ? "Today" : formatWeekday(midnight, "short"),
      dayOfMonth: zonedParts(midnight).day,
    };
  });
}

export function midnightOf(dayKey: string): Date {
  const [year, month, day] = dayKey.split("-").map(Number);
  return zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: day ?? Number.NaN,
  });
}

export function weekdayOf(dayKey: string): number {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Date(
    Date.UTC(year ?? Number.NaN, (month ?? Number.NaN) - 1, day ?? Number.NaN),
  ).getUTCDay();
}

export type StartTime = {
  startsAt: Date;
  label: string;
  freeCourts: number;
};

export type StartTimeGroup = { label: string; times: StartTime[] };

function meridiem(startsAt: Date) {
  return zonedParts(startsAt).hour < 12 ? "AM" : "PM";
}

function takesLength(
  slot: AvailabilityCourt["slots"][number],
  minutes: number,
) {
  return slot.durations.some((duration) => duration.minutes === minutes);
}

/**
 * Every start on the Venue's grid for the day that is not already too soon
 * and leaves room for `minutes` before closing, grouped into runs of AM and
 * PM so "6:00" is never ambiguous. A start no Court can take for that length
 * is kept with `freeCourts: 0`, which the screen strikes out.
 */
export function startTimeGroups(args: {
  dayKey: string;
  windows: readonly OpeningWindow[];
  slotMinutes: number;
  minutes: number;
  minLeadMinutes: number;
  courts: readonly AvailabilityCourt[];
  now: Date;
}): StartTimeGroup[] {
  const midnight = midnightOf(args.dayKey);
  const earliest = args.now.getTime() + args.minLeadMinutes * MS_PER_MINUTE;
  const freeByStart = new Map<number, number>();
  for (const court of args.courts) {
    for (const slot of court.slots) {
      if (!takesLength(slot, args.minutes)) {
        continue;
      }
      const at = slot.startsAt.getTime();
      freeByStart.set(at, (freeByStart.get(at) ?? 0) + 1);
    }
  }

  const starts = new Set<number>();
  for (const window of args.windows) {
    for (
      let minute = window.opensAtMinutes;
      minute + args.minutes <= window.closesAtMinutes;
      minute += args.slotMinutes
    ) {
      const at = midnight.getTime() + minute * MS_PER_MINUTE;
      if (at >= earliest) {
        starts.add(at);
      }
    }
  }

  const groups: StartTimeGroup[] = [];
  for (const at of [...starts].sort((a, b) => a - b)) {
    const startsAt = new Date(at);
    const afterMidnight =
      at >= midnight.getTime() + MINUTES_PER_DAY * MS_PER_MINUTE;
    const label = afterMidnight ? "After midnight" : meridiem(startsAt);
    const time = {
      startsAt,
      label: formatGameClockWithoutMeridiem(startsAt),
      freeCourts: freeByStart.get(at) ?? 0,
    };
    const last = groups.at(-1);
    if (last?.label === label) {
      last.times.push(time);
    } else {
      groups.push({ label, times: [time] });
    }
  }
  return groups;
}

export type DurationChoice = { minutes: number; offered: boolean };

/** Each length the Venue sells, offered when some Court takes it at some start of the day. */
export function durationChoices(args: {
  options: readonly number[];
  courts: readonly AvailabilityCourt[];
}): DurationChoice[] {
  return args.options.map((minutes) => ({
    minutes,
    offered: args.courts.some((court) =>
      court.slots.some((slot) => takesLength(slot, minutes)),
    ),
  }));
}

export type CourtChoice = {
  id: string;
  name: string;
  priceFils: number | null;
  fullyBooked: boolean;
};

/**
 * Every Court of the Venue, priced when it is free for this start and length.
 * A Court with no start left that day for the length is `fullyBooked`, so the
 * screen can tell "taken at this time" from "nothing left today".
 */
export function courtChoices(args: {
  startsAt: Date;
  minutes: number;
  venueCourts: readonly { id: string; name: string }[];
  courts: readonly AvailabilityCourt[];
}): CourtChoice[] {
  const at = args.startsAt.getTime();
  return args.venueCourts.map((court) => {
    const slots =
      args.courts.find((entry) => entry.id === court.id)?.slots ?? [];
    const duration = slots
      .find((entry) => entry.startsAt.getTime() === at)
      ?.durations.find((entry) => entry.minutes === args.minutes);
    return {
      id: court.id,
      name: court.name,
      priceFils: duration?.priceFils ?? null,
      fullyBooked: !slots.some((slot) => takesLength(slot, args.minutes)),
    };
  });
}

/** Keeps the current choice while it stays offered, else the first offered one. */
export function keepOrFirst<T>(
  current: T | null,
  offered: readonly T[],
): T | null {
  if (current !== null && offered.includes(current)) {
    return current;
  }
  return offered[0] ?? null;
}
