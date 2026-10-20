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
  formatWeekday,
} from "@repo/domain/format-game-start";
import { formatBookingPriceFils } from "@repo/domain/price-per-player";
import { productDaysBetween, zonedParts } from "@repo/domain/product-timezone";

const MS_PER_MINUTE = 60_000;

export type PaymentMode = "at_venue" | "online";

export function bookingPath(bookingId: string) {
  return `/book/bookings/${bookingId}` as const;
}

export function venuePath(venueId: string) {
  return `/book/venues/${venueId}` as const;
}

export function venueDetailsPath(venueId: string) {
  return `/book/venues/${venueId}/details` as const;
}

export function checkoutPath(
  venueId: string,
  startsAt: Date,
  durationMinutes: number,
) {
  return `/book/venues/${venueId}/checkout?startsAt=${encodeURIComponent(startsAt.toISOString())}&minutes=${durationMinutes}`;
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

/** "Today, Thu 15 Oct / 90 min". */
export function whenLine(startsAt: Date, minutes: number, now: Date): string {
  const days = productDaysBetween(now, startsAt);
  const date = formatDayMonth(startsAt, { weekday: "short" });
  const day =
    days === 0 ? `Today, ${date}` : days === 1 ? `Tomorrow, ${date}` : date;
  return `${day} / ${minutes} min`;
}

/** "Tonight / Karbabad Courts / Court 2". */
export function placeLine(
  startsAt: Date,
  venueName: string,
  courtName: string,
  now: Date,
): string {
  return [relativeDay(startsAt, now), venueName, courtName].join(" / ");
}

function isEvening(startsAt: Date) {
  return zonedParts(startsAt).hour >= 17;
}

/** "Tonight", "Today", "Tomorrow" or "Tue 20 Oct". */
export function relativeDay(startsAt: Date, now: Date): string {
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return isEvening(startsAt) ? "Tonight" : "Today";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  return formatDayMonth(startsAt, { weekday: "short" });
}

export function untilLabel(endsAt: Date): string {
  return `to ${formatGameClock(endsAt)}`;
}

export function bookedHeadline(
  courtName: string,
  startsAt: Date,
  now: Date,
): string {
  const days = productDaysBetween(now, startsAt);
  if (days === 0) {
    return `${courtName} is yours ${isEvening(startsAt) ? "tonight" : "today"}.`;
  }
  if (days === 1) {
    return `${courtName} is yours tomorrow.`;
  }
  return `${courtName} is yours on ${formatWeekday(startsAt, "long")}.`;
}

export function payButtonLabel(
  method: BookingPaymentMethod,
  courtName: string,
  priceFils: number,
): string {
  return method === "at_venue"
    ? `Book ${courtName}`
    : `Pay ${formatBookingPriceFils(priceFils)}`;
}

const PAYMENT_METHOD_COPY: Record<
  BookingPaymentMethod,
  { title: string; detail: string }
> = {
  card: { title: "Card", detail: "Visa, Mastercard or Amex" },
  benefit: { title: "BENEFIT", detail: "Bahraini debit card and PIN" },
  benefitpay: {
    title: "BenefitPay",
    detail: "Approve in the app or scan a QR",
  },
  apple_pay: { title: "Apple Pay", detail: "Confirm with Face ID or Touch ID" },
  at_venue: {
    title: "Pay at the venue",
    detail: "Settle at the desk when you arrive",
  },
};

export function paymentMethod(method: BookingPaymentMethod): {
  title: string;
  detail: string;
} {
  return PAYMENT_METHOD_COPY[method];
}

/**
 * The checkout's choices on this device. Apple Pay needs an Apple device, and
 * an API without the methods list offers its one mode.
 */
export function checkoutMethods(
  payment: { mode: PaymentMode; methods?: readonly BookingPaymentMethod[] },
  platform: string,
): BookingPaymentMethod[] {
  const methods = payment.methods ?? [
    payment.mode === "online" ? "card" : "at_venue",
  ];
  return methods.filter(
    (method) => method !== "apple_pay" || platform === "ios",
  );
}

/** "Full refund until Tue 18:00, then 50% refund", else the policy's first line. */
export function refundTerms(
  policy: RefundPolicy,
  policyLines: readonly string[],
  startsAt: Date,
  now: Date,
): string | null {
  return (
    describeNextRefundStep(nextRefundStep(policy, startsAt, now)) ??
    policyLines[0] ??
    null
  );
}

export function paymentStatusLine(
  status: PaymentStatus,
  bookingStatus: string,
): string {
  if (status === "pending" && bookingStatus === "confirmed") {
    return "Pay at the venue";
  }
  return paymentStatusLabel(status);
}

export function cancelConsequence(args: {
  paymentStatus: PaymentStatus;
  refundDueFilsNow: number;
  refundPercentNow: number;
}): string {
  if (args.paymentStatus !== "paid") {
    return "You have not paid for this booking, so there is nothing to refund.";
  }
  if (args.refundDueFilsNow <= 0) {
    return "It is too late for a refund. You will not get any money back.";
  }
  return `You'll be refunded ${formatBookingPriceFils(args.refundDueFilsNow)} (${args.refundPercentNow}%).`;
}
