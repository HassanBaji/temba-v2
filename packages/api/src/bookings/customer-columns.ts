import { bookings } from "@repo/db";

export const customerBookingColumns = {
  id: bookings.id,
  venueId: bookings.venueId,
  courtId: bookings.courtId,
  startsAt: bookings.startsAt,
  endsAt: bookings.endsAt,
  status: bookings.status,
  holdExpiresAt: bookings.holdExpiresAt,
  source: bookings.source,
  priceFils: bookings.priceFils,
  cancellationPolicy: bookings.cancellationPolicy,
  paymentStatus: bookings.paymentStatus,
  refundDueFils: bookings.refundDueFils,
  cancellationChargeFils: bookings.cancellationChargeFils,
  cancelledAt: bookings.cancelledAt,
  cancelledBy: bookings.cancelledBy,
  gameId: bookings.gameId,
  createdAt: bookings.createdAt,
};
