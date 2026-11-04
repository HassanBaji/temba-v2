import { describeNextRefundStep } from "@repo/domain/booking-copy";
import {
  paymentStatusLabel,
  type BookingPaymentMethod,
  type PaymentStatus,
} from "@repo/domain/booking-payment";
import { nextRefundStep, type RefundPolicy } from "@repo/domain/booking-refund";
import {
  formatDayMonth,
  formatGameClock,
  formatGameStart,
  formatWeekday,
} from "@repo/domain/format-game-start";
import { withGoogleLocale } from "@repo/domain/google-locale";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDaysBetween, zonedParts } from "@repo/domain/product-timezone";
import { DEFAULT_SPORT, type Sport } from "@repo/domain/sport";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { sportQuery } from "./book-sport";

const MS_PER_MINUTE = 60_000;

export type PaymentMode = "at_venue" | "online";

export function bookingPath(bookingId: string) {
  return `/book/bookings/${bookingId}` as const;
}

export function bookingGamePath(bookingId: string) {
  return `${bookingPath(bookingId)}/game` as const;
}

/**
 * A Booking opened from Profile stays in the Profile stack, so the tab bar
 * does not switch and Back returns to the list. Payment always runs in Book.
 */
export function bookingRowPath(
  segments: readonly string[],
  booking: { id: string; status: string },
) {
  if (booking.status === "pending_payment") {
    return `${bookingPath(booking.id)}/payment`;
  }
  return segments.includes("profile")
    ? `/profile/bookings/${booking.id}`
    : bookingPath(booking.id);
}

export function bookingsFallback(segments: readonly string[]) {
  return segments.includes("profile") ? "/profile/bookings" : "/book";
}

export function venuePath(venueId: string, sport: Sport = DEFAULT_SPORT) {
  const query = sportQuery(sport);
  return `/book/venues/${venueId}${query ? `?${query}` : ""}`;
}

export function venueDetailsPath(venueId: string) {
  return `/book/venues/${venueId}/details` as const;
}

export function checkoutPath(
  venueId: string,
  startsAt: Date,
  durationMinutes: number,
  courtId: string,
  sport: Sport = DEFAULT_SPORT,
) {
  const query = sportQuery(sport);
  return `/book/venues/${venueId}/checkout?startsAt=${encodeURIComponent(startsAt.toISOString())}&minutes=${durationMinutes}&courtId=${encodeURIComponent(courtId)}${query ? `&${query}` : ""}`;
}

type DirectionsVenue = {
  name: string;
  city: string;
  latitude: string | null;
  longitude: string | null;
};

/** Apple Maps on iOS, Google Maps elsewhere; the name and city when the Venue has no pin. */
export function directionsUrl(
  venue: DirectionsVenue,
  os: string,
  locale: Locale,
): string {
  const destination =
    venue.latitude && venue.longitude
      ? `${venue.latitude},${venue.longitude}`
      : `${venue.name}, ${venue.city}`;
  const encoded = encodeURIComponent(destination);
  return os === "ios"
    ? `https://maps.apple.com/?daddr=${encoded}`
    : withGoogleLocale(
        `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
        locale,
      );
}

export function bookingShareMessage(
  booking: {
    startsAt: Date;
    endsAt: Date;
    venue: { name: string };
    court: { name: string };
  },
  locale: Locale,
): string {
  return messagesFor(locale).mobileBooking.shareMessage(
    booking.court.name,
    booking.venue.name,
    formatGameStart(booking.startsAt, locale),
    formatGameClock(booking.endsAt, locale),
  );
}

/** A short reference a Customer can read out at the desk. */
export function bookingRef(bookingId: string): string {
  return bookingId.replace(/-/g, "").slice(0, 6).toUpperCase();
}

export function endsAfter(startsAt: Date, minutes: number): Date {
  return new Date(startsAt.getTime() + minutes * MS_PER_MINUTE);
}

export function minutesBetween(startsAt: Date, endsAt: Date): number {
  return Math.round((endsAt.getTime() - startsAt.getTime()) / MS_PER_MINUTE);
}

function dayLine(startsAt: Date, now: Date, locale: Locale): string {
  const m = messagesFor(locale).mobileBooking;
  const days = productDaysBetween(now, startsAt);
  const date = formatDayMonth(startsAt, locale, { weekday: "short" });
  return days === 0
    ? m.todayDate(date)
    : days === 1
      ? m.tomorrowDate(date)
      : date;
}

/** "Today, Thu 15 Oct / 90 min". */
export function whenLine(
  startsAt: Date,
  minutes: number,
  now: Date,
  locale: Locale,
): string {
  return messagesFor(locale).mobileBooking.whenLine(
    dayLine(startsAt, now, locale),
    minutes,
  );
}

/** "Today, Thu 15 Oct / 7:30 PM to 8:30 PM / 60 min". */
export function slotLine(
  startsAt: Date,
  minutes: number,
  now: Date,
  locale: Locale,
): string {
  const endsAt = endsAfter(startsAt, minutes);
  return messagesFor(locale).mobileBooking.slotLine(
    dayLine(startsAt, now, locale),
    formatGameClock(startsAt, locale),
    formatGameClock(endsAt, locale),
    minutes,
  );
}

/** "Tonight / Karbabad Courts / Court 2". */
export function placeLine(
  startsAt: Date,
  venueName: string,
  courtName: string,
  now: Date,
  locale: Locale,
): string {
  return messagesFor(locale).mobileBooking.placeLine(
    relativeDay(startsAt, now, locale),
    venueName,
    courtName,
  );
}

function isEvening(startsAt: Date) {
  return zonedParts(startsAt).hour >= 17;
}

/** "Tonight", "Today", "Tomorrow" or "Tue 20 Oct". */
export function relativeDay(startsAt: Date, now: Date, locale: Locale): string {
  const m = messagesFor(locale);
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return isEvening(startsAt) ? m.dates.tonight : m.common.today;
  }
  if (days === 1) {
    return m.common.tomorrow;
  }
  return formatDayMonth(startsAt, locale, { weekday: "short" });
}

export function untilLabel(endsAt: Date, locale: Locale): string {
  return messagesFor(locale).mobileBooking.untilClock(
    formatGameClock(endsAt, locale),
  );
}

export function bookedHeadline(
  courtName: string,
  startsAt: Date,
  now: Date,
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking.bookedHeadline;
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return isEvening(startsAt) ? m.tonight(courtName) : m.today(courtName);
  }
  if (days === 1) {
    return m.tomorrow(courtName);
  }
  return m.onDay(courtName, formatWeekday(startsAt, "long", locale));
}

export function payButtonLabel(
  method: BookingPaymentMethod,
  priceFils: number,
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking.payButton;
  const price = formatBookingPriceFils(priceFils, locale);
  return method === "at_venue" ? m.reserveAtVenue(price) : m.pay(price);
}

// Payment network names are brands, not copy.
const PAYMENT_METHOD_BRANDS = {
  benefit: "Benefit",
  benefitpay: "BenefitPay",
  apple_pay: "Apple Pay",
} as const;

export function paymentMethod(
  method: BookingPaymentMethod,
  locale: Locale,
): {
  title: string;
  detail: string;
} {
  const m = messagesFor(locale).mobileBooking.paymentMethods;
  switch (method) {
    case "card":
      return m.card;
    case "benefit":
      return { title: PAYMENT_METHOD_BRANDS.benefit, detail: m.benefitDetail };
    case "benefitpay":
      return {
        title: PAYMENT_METHOD_BRANDS.benefitpay,
        detail: m.benefitpayDetail,
      };
    case "apple_pay":
      return {
        title: PAYMENT_METHOD_BRANDS.apple_pay,
        detail: m.applePayDetail,
      };
    case "at_venue":
      return m.atVenue;
  }
}

const CHECKOUT_ORDER: readonly BookingPaymentMethod[] = [
  "apple_pay",
  "benefit",
  "benefitpay",
  "card",
  "at_venue",
];

/**
 * The checkout's choices on this device, wallet first. Apple Pay needs an
 * Apple device, and an API without the methods list offers its one mode.
 */
export function checkoutMethods(
  payment: { mode: PaymentMode; methods?: readonly BookingPaymentMethod[] },
  platform: string,
): BookingPaymentMethod[] {
  const methods = payment.methods ?? [
    payment.mode === "online" ? "card" : "at_venue",
  ];
  return CHECKOUT_ORDER.filter(
    (method) =>
      methods.includes(method) &&
      (method !== "apple_pay" || platform === "ios"),
  );
}

function deadlineLine(deadline: Date, now: Date, locale: Locale): string {
  const m = messagesFor(locale);
  const days = productDaysBetween(now, deadline);
  const day =
    days === 0
      ? m.mobileBooking.todayInSentence
      : days === 1
        ? m.dates.tomorrowInSentence
        : formatDayMonth(deadline, locale, { weekday: "short" });
  return m.mobileBooking.clockOnDay(formatGameClock(deadline, locale), day);
}

/**
 * "Free cancellation until 6:30 PM today.", "Full refund until Tue 18:00, then
 * 50% refund.", else the policy's first line.
 */
export function refundTerms(
  policy: RefundPolicy,
  policyLines: readonly string[],
  startsAt: Date,
  now: Date,
  locale: Locale,
): string | null {
  const step = nextRefundStep(policy, startsAt, now);
  if (step && step.currentPercent >= 100) {
    return messagesFor(locale).mobileBooking.freeCancellationUntil(
      deadlineLine(step.deadline, now, locale),
    );
  }
  const line = describeNextRefundStep(step, locale) ?? policyLines[0];
  return line ? `${line.replace(/\.$/, "")}.` : null;
}

export function paymentStatusLine(
  status: PaymentStatus,
  bookingStatus: string,
  locale: Locale,
): string {
  if (status === "pending" && bookingStatus === "confirmed") {
    return messagesFor(locale).mobileBooking.payAtTheVenue;
  }
  return paymentStatusLabel(status, locale);
}

export function cancelConsequence(
  args: {
    paymentStatus: PaymentStatus;
    refundDueFilsNow: number;
    refundPercentNow: number;
  },
  locale: Locale,
): string {
  const m = messagesFor(locale).mobileBooking.cancelConsequence;
  if (args.paymentStatus !== "paid") {
    return m.notPaid;
  }
  if (args.refundDueFilsNow <= 0) {
    return m.tooLate;
  }
  return m.refunded(
    formatBookingPriceFils(args.refundDueFilsNow, locale),
    args.refundPercentNow,
  );
}
