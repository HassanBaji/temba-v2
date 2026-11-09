import { plural } from "../../plural";

export const booking = {
  status: {
    pendingPayment: "Awaiting payment",
    confirmed: "Confirmed",
    cancelled: "Cancelled",
    noShow: "No-show",
    expired: "Expired",
  },
  paymentStatus: {
    pending: "Pending",
    paid: "Paid",
    failed: "Failed",
    refunded: "Refunded",
    partiallyRefunded: "Partially refunded",
    waived: "Waived",
  },
  slotRefusal: {
    badDuration: "That duration is not offered at this Venue",
    offGrid: "That start time is not on this Venue's booking grid",
    tooSoon: "That time is too soon to book",
    tooFar: "That day is too far ahead to book",
    ended: "That time has already passed",
    outsideHours: "The Venue is not open at that time",
    closure: "That time is unavailable",
    noPrice: "That time cannot be booked",
    taken: "That slot was just taken",
  },
  cancelWindowClosedCall: (venuePhone: string) =>
    `This Booking can no longer be cancelled in the app. Call the Venue on ${venuePhone}`,
  cancelWindowClosedContact:
    "This Booking can no longer be cancelled in the app. Contact the Venue",
  customerLimit: {
    liveHolds: (count: number) =>
      plural("en", count, {
        one: "You already have a Booking waiting for payment at this Venue. Finish paying or wait for it to lapse",
        other:
          "You already have {n} Bookings waiting for payment at this Venue. Finish paying or wait for one to lapse",
      }),
    unpaidAtVenue: (count: number) =>
      plural("en", count, {
        one: "You already have an upcoming Booking to pay at this Venue. Cancel it to book another",
        other:
          "You already have {n} upcoming Bookings to pay at this Venue. Cancel one to book another",
      }),
  },
  refund: {
    full: "Full refund",
    none: "No refund",
    percent: (percent: number) => `${percent}% refund`,
  },
  nextRefundStep: (current: string, when: string, next: string) =>
    `${current} until ${when}, then ${next.toLowerCase()}`,
  bookedCourtLine: (court: string, start: string, end: string) =>
    `${court}, ${start} to ${end}`,
  policy: {
    freeAnyTime: "Free cancellation at any time",
    refundOnCancellation: (refund: string) => `${refund} on cancellation`,
    refundUntilHoursBefore: (refund: string, hours: number) =>
      plural("en", hours, {
        one: `${refund} until 1 hour before`,
        other: `${refund} until {n} hours before`,
      }),
    refundAfterThat: (refund: string) => `${refund} after that`,
    cancelInAppUntil: (duration: string) =>
      `Cancel in the app until ${duration} before the start`,
    hours: (n: number) =>
      plural("en", n, { one: "1 hour", other: "{n} hours" }),
    minutes: (n: number) =>
      plural("en", n, { one: "1 minute", other: "{n} minutes" }),
  },
};
