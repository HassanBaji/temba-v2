import type { SlotBooking } from "./booking-slots";

export type ManagerBookingActions = {
  edit: boolean;
  cancel: boolean;
  noShow: boolean;
};

/**
 * What a Venue manager may still do to a Booking (invariants 6 and 9). Before
 * its end a live Booking can be cancelled, and a confirmed one edited unless
 * the Venue is Soft-archived; once it has started a confirmed Booking can be
 * marked no-show, which is the only move left after its end.
 */
export function managerBookingActions(
  booking: Pick<SlotBooking, "status" | "startsAt" | "endsAt">,
  venueArchived: boolean,
  now: Date,
): ManagerBookingActions {
  const ended = booking.endsAt.getTime() <= now.getTime();
  const started = booking.startsAt.getTime() <= now.getTime();
  const confirmed = booking.status === "confirmed";
  return {
    edit: confirmed && !ended && !venueArchived,
    cancel: !ended && (confirmed || booking.status === "pending_payment"),
    noShow: confirmed && started,
  };
}
