import {
  addProductDays,
  productDayKey,
  zonedDateTimeToInstant,
} from "@repo/domain/product-timezone";

const MS_PER_MINUTE = 60_000;
const DEFAULT_OPEN_MINUTES = 8 * 60;
const DEFAULT_CLOSE_MINUTES = 22 * 60;

export type GridWindow = { opensAtMinutes: number; closesAtMinutes: number };

export type GridBooking = {
  id: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
};

export type GridClosure = {
  id: string;
  courtId: string | null;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
};

export type DayGridRow = { minute: number; open: boolean };

export type PlacedInterval = { startMinute: number; endMinute: number };

export function dayStart(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: date ?? Number.NaN,
  });
}

export function addDays(day: string, days: number): string {
  const next = addProductDays(dayStart(day), days);
  return productDayKey(next);
}

export function weekdayOf(day: string): number {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1)).getUTCDay();
}

/** The Monday on or before `day`; weeks run Monday to Sunday like the hours editor. */
export function weekStart(day: string): string {
  return addDays(day, -((weekdayOf(day) + 6) % 7));
}

export function weekDays(day: string): string[] {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function minutesFromDayStart(day: string, instant: Date): number {
  return Math.round(
    (instant.getTime() - dayStart(day).getTime()) / MS_PER_MINUTE,
  );
}

export function placeInterval(
  day: string,
  interval: { startsAt: Date; endsAt: Date },
): PlacedInterval {
  return {
    startMinute: minutesFromDayStart(day, interval.startsAt),
    endMinute: minutesFromDayStart(day, interval.endsAt),
  };
}

export function overlapsDay(
  day: string,
  interval: { startsAt: Date; endsAt: Date },
): boolean {
  const { startMinute, endMinute } = placeInterval(day, interval);
  return startMinute < 24 * 60 && endMinute > 0;
}

export function inWindows(windows: GridWindow[], minute: number): boolean {
  return windows.some(
    (window) =>
      minute >= window.opensAtMinutes && minute < window.closesAtMinutes,
  );
}

/**
 * The day's grid rows at the Venue's step. The grid covers the Opening hours
 * and stretches to hold any Booking outside them, so a manager-made Booking
 * never disappears.
 */
export function buildDayGrid(args: {
  day: string;
  slotMinutes: number;
  windows: GridWindow[];
  bookings: GridBooking[];
}) {
  const { day, slotMinutes, windows } = args;
  const spans: PlacedInterval[] = [
    ...windows.map((window) => ({
      startMinute: window.opensAtMinutes,
      endMinute: window.closesAtMinutes,
    })),
    ...args.bookings
      .filter((booking) => overlapsDay(day, booking))
      .map((booking) => placeInterval(day, booking)),
  ];

  const first = spans.length
    ? Math.min(...spans.map((span) => span.startMinute))
    : DEFAULT_OPEN_MINUTES;
  const last = spans.length
    ? Math.max(...spans.map((span) => span.endMinute))
    : DEFAULT_CLOSE_MINUTES;

  const startMinute = Math.max(
    0,
    Math.floor(first / slotMinutes) * slotMinutes,
  );
  const endMinute = Math.ceil(last / slotMinutes) * slotMinutes;

  const rows: DayGridRow[] = [];
  for (let minute = startMinute; minute < endMinute; minute += slotMinutes) {
    rows.push({ minute, open: inWindows(windows, minute) });
  }
  return { startMinute, endMinute, rows };
}

/** Where an interval sits in the grid, in rows from the top, clipped to it. */
export function rowSpan(
  grid: { startMinute: number; endMinute: number },
  slotMinutes: number,
  interval: PlacedInterval,
) {
  const start = Math.max(interval.startMinute, grid.startMinute);
  const end = Math.min(interval.endMinute, grid.endMinute);
  if (end <= start) {
    return null;
  }
  return {
    top: (start - grid.startMinute) / slotMinutes,
    height: (end - start) / slotMinutes,
  };
}

export function closuresForCourt(
  closures: GridClosure[],
  courtId: string,
  day: string,
) {
  return closures.filter(
    (closure) =>
      (closure.courtId === null || closure.courtId === courtId) &&
      overlapsDay(day, closure),
  );
}

export function formatClock(minute: number): string {
  const inDay = ((minute % 1440) + 1440) % 1440;
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}

/** Clamps a requested range so the door never refuses it for being too long. */
export function clampRange(from: string, to: string, maxDays: number) {
  const last = addDays(from, maxDays - 1);
  return to < from ? from : to > last ? last : to;
}

export type RefundDisplay = "none" | "in_progress" | "failed";

/**
 * A Tap refund is a job: the door returns at once and the job later records
 * the result. While the Payment row has not changed since the request, the
 * refund is still in progress.
 */
export function refundDisplay(
  payment: { updatedAt: Date; refundFailureReason: string | null },
  requestedAtUpdatedAt: Date | null,
): RefundDisplay {
  if (payment.updatedAt.getTime() === requestedAtUpdatedAt?.getTime()) {
    return "in_progress";
  }
  return payment.refundFailureReason ? "failed" : "none";
}

export type LedgerPayment = {
  provider: "manual" | "tap";
  status:
    | "pending"
    | "paid"
    | "failed"
    | "refunded"
    | "partially_refunded"
    | "waived";
  createdAt: Date;
};

/**
 * What a manager can do to the latest Payment by hand. A Booking with no
 * Payment row yet (a legacy row) is settled as a manual one.
 */
export function settleActions(
  bookingStatus: string,
  payments: readonly LedgerPayment[],
) {
  const none = { pay: false, waive: false, fail: false };
  if (bookingStatus !== "confirmed" && bookingStatus !== "no_show") {
    return none;
  }
  const latest = [...payments].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  )[0];
  if (!latest) {
    return { pay: true, waive: true, fail: true };
  }
  if (latest.provider === "manual" && latest.status === "pending") {
    return { pay: true, waive: true, fail: true };
  }
  if (latest.provider === "tap" && latest.status === "failed") {
    return { pay: false, waive: true, fail: false };
  }
  return none;
}
