import { and, eq, gt, or, type SQL } from "drizzle-orm";

import { bookings } from "@repo/db";

/** SQL twin of `isOccupyingBooking` in `@repo/domain/booking-slots`. */
export function occupyingBookings(now: Date): SQL {
  return or(
    eq(bookings.status, "confirmed"),
    and(
      eq(bookings.status, "pending_payment"),
      gt(bookings.holdExpiresAt, now),
    ),
  )!;
}
