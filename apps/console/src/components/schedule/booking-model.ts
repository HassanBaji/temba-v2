import type { PaymentStatus } from "@repo/domain/booking-payment";
import { isOccupyingBooking } from "@repo/domain/booking-slots";
import {
  addProductDays,
  productDayKey,
  zonedDateTimeToInstant,
} from "@repo/domain/product-timezone";

const MS_PER_MINUTE = 60_000;
const MINUTES_PER_DAY = 24 * 60;
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

function minuteInDay(minute: number): number {
  return ((minute % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}

export function formatClock(minute: number): string {
  const inDay = minuteInDay(minute);
  return `${String(Math.floor(inDay / 60)).padStart(2, "0")}:${String(inDay % 60).padStart(2, "0")}`;
}

/** The time axis clock: `2:00 PM` with the meridiem, `3:00` without. */
export function formatAxisClock(
  minute: number,
  style: "meridiem" | "bare" = "bare",
): string {
  const inDay = minuteInDay(minute);
  const hours = Math.floor(inDay / 60);
  const clock = `${((hours + 11) % 12) + 1}:${String(inDay % 60).padStart(2, "0")}`;
  return style === "meridiem" ? `${clock} ${hours < 12 ? "AM" : "PM"}` : clock;
}

/**
 * The whole hours inside the grid, labelled like the design: the first mark
 * and each noon or midnight carry the meridiem, the rest are bare.
 */
export function hourMarks(grid: { startMinute: number; endMinute: number }) {
  const marks: { minute: number; label: string }[] = [];
  const first = Math.ceil(grid.startMinute / 60) * 60;
  for (let minute = first; minute < grid.endMinute; minute += 60) {
    const meridiem = marks.length === 0 || minuteInDay(minute) % 720 === 0;
    marks.push({
      minute,
      label: formatAxisClock(minute, meridiem ? "meridiem" : "bare"),
    });
  }
  return marks;
}

/** Minutes from the grid top to `now`, or null when `now` is outside the grid. */
export function nowOffset(
  grid: { startMinute: number; endMinute: number },
  day: string,
  now: Date,
): number | null {
  const minute = minutesFromDayStart(day, now);
  if (minute < grid.startMinute || minute > grid.endMinute) {
    return null;
  }
  return minute - grid.startMinute;
}

export function closureTimeLabel(
  placed: PlacedInterval,
  grid: { startMinute: number; endMinute: number },
): string {
  const coversStart = placed.startMinute <= grid.startMinute;
  const coversEnd = placed.endMinute >= grid.endMinute;
  if (coversStart && coversEnd) {
    return "All day";
  }
  if (coversEnd) {
    return `From ${formatAxisClock(placed.startMinute, "meridiem")}`;
  }
  return `Until ${formatAxisClock(placed.endMinute, "meridiem")}`;
}

export type BookingStatus =
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "expired";

export type BlockTone = "ink" | "outline" | "muted";

/**
 * The block colour language: ink for an app Booking still to come, outline
 * for one the Venue made by hand, muted once it has ended.
 */
export function blockTone(
  booking: { source: "app" | "venue"; endsAt: Date },
  now: Date,
): BlockTone {
  if (booking.endsAt.getTime() <= now.getTime()) {
    return "muted";
  }
  return booking.source === "venue" ? "outline" : "ink";
}

export function durationMinutes(interval: {
  startsAt: Date;
  endsAt: Date;
}): number {
  return Math.round(
    (interval.endsAt.getTime() - interval.startsAt.getTime()) / MS_PER_MINUTE,
  );
}

const PAYMENT_WORDS: Record<PaymentStatus, string> = {
  pending: "unpaid",
  paid: "paid",
  failed: "payment failed",
  refunded: "refunded",
  partially_refunded: "partly refunded",
  waived: "waived",
};

/** The block's second line: `90 min, paid`. */
export function blockDetailLine(booking: {
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
}): string {
  const minutes = `${durationMinutes(booking)} min`;
  switch (booking.status) {
    case "pending_payment":
      return `${minutes}, awaiting payment`;
    case "no_show":
      return `${minutes}, no-show`;
    case "cancelled":
      return `${minutes}, cancelled`;
    case "expired":
      return `${minutes}, expired`;
    default:
      return `${minutes}, ${PAYMENT_WORDS[booking.paymentStatus]}`;
  }
}

export function openMinutes(windows: GridWindow[]): number {
  return windows.reduce(
    (sum, window) => sum + (window.closesAtMinutes - window.opensAtMinutes),
    0,
  );
}

/** How many of an interval's minutes fall inside the Opening hours. */
export function clippedOpenMinutes(
  windows: GridWindow[],
  interval: PlacedInterval,
): number {
  return windows.reduce((sum, window) => {
    const start = Math.max(interval.startMinute, window.opensAtMinutes);
    const end = Math.min(interval.endMinute, window.closesAtMinutes);
    return sum + Math.max(0, end - start);
  }, 0);
}

export type StatBooking = GridBooking & {
  status: BookingStatus;
  holdExpiresAt: Date | null;
  paymentStatus: PaymentStatus;
  priceFils: number;
};

export type ScheduleStats = {
  bookings: number;
  occupiedPercent: number | null;
  takenFils: number;
};

/**
 * The stat line for the shown days: Bookings on them, occupying Booking
 * minutes over open Court minutes, and the sum paid. A Booking that spans
 * midnight counts once.
 */
export function scheduleStats(args: {
  days: { day: string; windows: GridWindow[] }[];
  bookings: StatBooking[];
  courtCount: number;
  now: Date;
}): ScheduleStats {
  const shown = args.bookings.filter((booking) =>
    args.days.some((entry) => overlapsDay(entry.day, booking)),
  );

  let occupied = 0;
  let open = 0;
  for (const entry of args.days) {
    open += openMinutes(entry.windows) * args.courtCount;
    for (const booking of shown) {
      if (
        overlapsDay(entry.day, booking) &&
        isOccupyingBooking(booking, args.now)
      ) {
        occupied += clippedOpenMinutes(
          entry.windows,
          placeInterval(entry.day, booking),
        );
      }
    }
  }

  return {
    bookings: shown.length,
    occupiedPercent: open > 0 ? Math.round((occupied / open) * 100) : null,
    takenFils: shown
      .filter((booking) => booking.paymentStatus === "paid")
      .reduce((sum, booking) => sum + booking.priceFils, 0),
  };
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
