import { priceForInterval, type PricingRuleInput } from "./booking-price";
import {
  addProductDays,
  startOfProductDay,
  zonedDateTimeToInstant,
  zonedParts,
} from "./product-timezone";

export type SlotCourt = { id: string };

export type SlotOpeningWindow = {
  weekday: number;
  opensAtMinutes: number;
  closesAtMinutes: number;
};

export type SlotClosure = {
  courtId: string | null;
  startsAt: Date;
  endsAt: Date;
};

export type SlotBooking = {
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  status: "pending_payment" | "confirmed" | "cancelled" | "no_show" | "expired";
  holdExpiresAt: Date | null;
};

export type SlotSettings = {
  slotMinutes: number;
  durationOptionsMinutes: readonly number[];
  bookingHorizonDays: number;
  minLeadMinutes: number;
};

export type SlotInput = {
  courts: readonly SlotCourt[];
  openingHours: readonly SlotOpeningWindow[];
  closures: readonly SlotClosure[];
  rules: readonly PricingRuleInput[];
  bookings: readonly SlotBooking[];
  settings: SlotSettings;
  now: Date;
};

export type SlotRefusal =
  | "bad_duration"
  | "off_grid"
  | "too_soon"
  | "too_far"
  | "outside_hours"
  | "closure"
  | "no_price"
  | "taken";

export type SlotCheck =
  | { ok: true; priceFils: number }
  | { ok: false; reason: SlotRefusal };

export type DaySlot = {
  startsAt: Date;
  durations: { minutes: number; priceFils: number }[];
};

export type CourtDaySlots = { courtId: string; slots: DaySlot[] };

const MS_PER_MINUTE = 60_000;

/** Confirmed, or pending payment while the hold is live. */
export function isOccupyingBooking(
  booking: Pick<SlotBooking, "status" | "holdExpiresAt">,
  now: Date,
): boolean {
  if (booking.status === "confirmed") {
    return true;
  }
  return (
    booking.status === "pending_payment" &&
    booking.holdExpiresAt !== null &&
    booking.holdExpiresAt.getTime() > now.getTime()
  );
}

function overlaps(
  a: { startsAt: Date; endsAt: Date },
  b: { startsAt: Date; endsAt: Date },
) {
  return (
    a.startsAt.getTime() < b.endsAt.getTime() &&
    b.startsAt.getTime() < a.endsAt.getTime()
  );
}

function weekdayOfProductDay(midnight: Date) {
  const { year, month, day } = zonedParts(midnight);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function fitsAnOpeningWindow(
  openingHours: readonly SlotOpeningWindow[],
  interval: { startsAt: Date; endsAt: Date },
) {
  const startDay = startOfProductDay(interval.startsAt);
  const previousDay = addProductDays(interval.startsAt, -1);
  return [startDay, previousDay].some((openedOn) => {
    const weekday = weekdayOfProductDay(openedOn);
    return openingHours.some(
      (window) =>
        window.weekday === weekday &&
        interval.startsAt.getTime() >=
          openedOn.getTime() + window.opensAtMinutes * MS_PER_MINUTE &&
        interval.endsAt.getTime() <=
          openedOn.getTime() + window.closesAtMinutes * MS_PER_MINUTE,
    );
  });
}

export function evaluateSlot(
  input: SlotInput,
  candidate: { courtId: string; startsAt: Date; durationMinutes: number },
): SlotCheck {
  const { settings, now } = input;
  const interval = {
    startsAt: candidate.startsAt,
    endsAt: new Date(
      candidate.startsAt.getTime() + candidate.durationMinutes * MS_PER_MINUTE,
    ),
  };

  if (!settings.durationOptionsMinutes.includes(candidate.durationMinutes)) {
    return { ok: false, reason: "bad_duration" };
  }

  const parts = zonedParts(candidate.startsAt);
  if (
    candidate.startsAt.getTime() % MS_PER_MINUTE !== 0 ||
    parts.second !== 0 ||
    (parts.hour * 60 + parts.minute) % settings.slotMinutes !== 0
  ) {
    return { ok: false, reason: "off_grid" };
  }

  if (
    interval.startsAt.getTime() <
    now.getTime() + settings.minLeadMinutes * MS_PER_MINUTE
  ) {
    return { ok: false, reason: "too_soon" };
  }
  if (
    interval.startsAt.getTime() >=
    addProductDays(now, settings.bookingHorizonDays).getTime()
  ) {
    return { ok: false, reason: "too_far" };
  }

  if (!fitsAnOpeningWindow(input.openingHours, interval)) {
    return { ok: false, reason: "outside_hours" };
  }

  if (
    input.closures.some(
      (closure) =>
        (closure.courtId === null || closure.courtId === candidate.courtId) &&
        overlaps(closure, interval),
    )
  ) {
    return { ok: false, reason: "closure" };
  }

  const price = priceForInterval(input.rules, {
    courtId: candidate.courtId,
    ...interval,
  });
  if ("uncovered" in price) {
    return { ok: false, reason: "no_price" };
  }

  if (
    input.bookings.some(
      (booking) =>
        booking.courtId === candidate.courtId &&
        isOccupyingBooking(booking, now) &&
        overlaps(booking, interval),
    )
  ) {
    return { ok: false, reason: "taken" };
  }

  return { ok: true, priceFils: price.fils };
}

/**
 * The bookable Slots of one opening day, "YYYY-MM-DD" in the product
 * timezone. A window running past midnight lists its late starts under the
 * day it opened on.
 */
export function slotsForDay(input: SlotInput, day: string): CourtDaySlots[] {
  const [year, month, date] = day.split("-").map(Number);
  const midnight = zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: date ?? Number.NaN,
  });
  const weekday = weekdayOfProductDay(midnight);
  const windows = input.openingHours
    .filter((window) => window.weekday === weekday)
    .sort((a, b) => a.opensAtMinutes - b.opensAtMinutes);
  const { slotMinutes, durationOptionsMinutes } = input.settings;

  return input.courts.map((court) => {
    const slots: DaySlot[] = [];
    for (const window of windows) {
      for (
        let minute = window.opensAtMinutes;
        minute < window.closesAtMinutes;
        minute += slotMinutes
      ) {
        const startsAt = new Date(midnight.getTime() + minute * MS_PER_MINUTE);
        const durations: DaySlot["durations"] = [];
        for (const minutes of durationOptionsMinutes) {
          const check = evaluateSlot(input, {
            courtId: court.id,
            startsAt,
            durationMinutes: minutes,
          });
          if (check.ok) {
            durations.push({ minutes, priceFils: check.priceFils });
          }
        }
        if (durations.length > 0) {
          slots.push({ startsAt, durations });
        }
      }
    }
    return { courtId: court.id, slots };
  });
}
