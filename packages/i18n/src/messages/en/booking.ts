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
  errors: {
    notFound: "Booking not found",
    venueArchived: "This Venue is archived",
    notAccepting: "This Venue is not accepting bookings",
    noCourts: "This Venue has no Courts to book",
    alreadyChanged: "This Booking was already changed",
    choosePaymentMethod: "Choose how the Payment was made",
    paymentNotFound: "Payment not found",
    refundPaidOnly: "Only a paid Payment can be refunded",
    refundTooMuch: "That is more than can still be refunded",
    onlineNotSettled: "A Payment taken online cannot be settled by hand",
    noPendingPayment: "There is no pending Payment to settle",
    viewForbidden: "You can't view this Booking",
    holderCancels: "Only the holder can cancel this Booking",
    cannotCancel: "This Booking can no longer be cancelled",
    endedMarkNoShow: "This Booking has ended. Mark it no-show instead",
    paidAtVenue: "This Booking is paid at the Venue",
    holderConfirms: "Only the holder can confirm this payment",
    noPaymentToConfirm: "There is no payment to confirm for this Booking",
    courtNotAtVenue: "That Court does not belong to this Venue",
    onlineOnly: "This Venue takes payment online only",
    payMethodUnavailable: "That way to pay is not available",
    noPricingRule: "No Pricing rule covers that time. Type a price",
    holderCreatesGame: "Only the holder can create a Game for this Booking",
    confirmedHasGame: "Only a confirmed Booking can have a Game",
    ended: "This Booking has already ended",
    hasGame: "This Booking already has a Game",
    footballGroup: "Pick a football Group for this pitch",
    padelGroup: "Pick a padel Group for this Court",
    invalidDay: "Not a valid day",
    endBeforeStart: "The end day is before the start day",
    rangeTooLong: (max: number) =>
      plural("en", max, {
        one: "Choose at most 1 day",
        other: "Choose at most {n} days",
      }),
    holderSeesPayment: "Only the holder can see this Booking's payment",
    nothingPaid: "Nothing has been paid on this Booking",
    refundAtMost: (fils: number) =>
      plural("en", fils, {
        one: "At most 1 fils can still be refunded",
        other: "At most {n} fils can still be refunded",
      }),
    holderRetries: "Only the holder can retry this payment",
    notAwaitingPayment: "This Booking is no longer waiting for payment",
    lastPaymentNotFailed: "The last payment has not failed",
    notAwaitingSettlement: "This Booking is not awaiting settlement",
    noShowAfterStart: "A Booking can be marked no-show once it has started",
    noShowConfirmedOnly: "Only a confirmed Booking can be marked no-show",
    editConfirmedOnly:
      "Only a confirmed Booking that has not ended can be edited",
    gamePlanned: "A Game is planned on this Booking. Cancel the Game first",
    priceSettled: (price: string) =>
      `The payment is settled, so the price stays ${price}. Type it as the price to move this Booking`,
    priceLocked: "The payment is settled, so the price cannot change",
    outsideWindow: "That day is outside the booking window",
  },
};
