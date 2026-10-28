import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { bookings, venues } from "@repo/db";
import type { DbTx } from "@repo/db";

import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

/** Locks the Booking for the rest of the transaction and checks the caller manages its Venue. */
export async function requireManagedBooking(
  tx: DbTx,
  args: {
    bookingId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
  },
) {
  const [booking] = await tx
    .select()
    .from(bookings)
    .where(eq(bookings.id, args.bookingId))
    .for("update");
  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }
  await requireVenueManager(tx, { venueId: booking.venueId, ...args.actor });

  const [venue] = await tx
    .select({ archivedAt: venues.archivedAt })
    .from(venues)
    .where(eq(venues.id, booking.venueId));
  return { booking, venueArchived: Boolean(venue?.archivedAt) };
}
