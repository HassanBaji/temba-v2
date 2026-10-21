import { TRPCError } from "@trpc/server";
import { and, asc, eq, gt, ne } from "drizzle-orm";

import {
  bookings,
  courts,
  venueClosures,
  venueOpeningHours,
  venuePricingRules,
  venues,
} from "@repo/db";
import type { DbClient, DbTx } from "@repo/db";
import type { SlotInput } from "@repo/domain/booking-slots";

import { occupyingBookings } from "#src/bookings/occupying";

type DbOrTx = DbClient | DbTx;

export type VenueSlotContext = {
  venue: {
    id: string;
    name: string;
    phone: string | null;
    archivedAt: Date | null;
    acceptingBookings: boolean;
    payAtVenueAllowed: boolean;
    cancellationPolicy: (typeof venues.$inferSelect)["cancellationPolicy"];
  };
  courts: { id: string; name: string }[];
  input: SlotInput;
};

/**
 * Everything the pure Slot rules need for one Venue: the one read behind the
 * availability door and the Booking create and move checks. A Booking being
 * moved is left out of the occupying Bookings so it does not block itself.
 */
export async function loadVenueSlotContext(
  database: DbOrTx,
  venueId: string,
  now: Date,
  options: { excludeBookingId?: string } = {},
): Promise<VenueSlotContext | null> {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, venueId),
  });
  if (!venue) {
    return null;
  }

  const [courtRows, hours, closures, rules, occupying] = await Promise.all([
    database
      .select({ id: courts.id, name: courts.name })
      .from(courts)
      .where(eq(courts.venueId, venueId))
      .orderBy(asc(courts.name), asc(courts.id)),
    database
      .select({
        weekday: venueOpeningHours.weekday,
        opensAtMinutes: venueOpeningHours.opensAtMinutes,
        closesAtMinutes: venueOpeningHours.closesAtMinutes,
      })
      .from(venueOpeningHours)
      .where(eq(venueOpeningHours.venueId, venueId)),
    database
      .select({
        courtId: venueClosures.courtId,
        startsAt: venueClosures.startsAt,
        endsAt: venueClosures.endsAt,
      })
      .from(venueClosures)
      .where(
        and(eq(venueClosures.venueId, venueId), gt(venueClosures.endsAt, now)),
      ),
    database
      .select({
        courtId: venuePricingRules.courtId,
        weekdays: venuePricingRules.weekdays,
        startMinutes: venuePricingRules.startMinutes,
        endMinutes: venuePricingRules.endMinutes,
        hourlyRateFils: venuePricingRules.hourlyRateFils,
      })
      .from(venuePricingRules)
      .where(eq(venuePricingRules.venueId, venueId)),
    database
      .select({
        courtId: bookings.courtId,
        startsAt: bookings.startsAt,
        endsAt: bookings.endsAt,
        status: bookings.status,
        holdExpiresAt: bookings.holdExpiresAt,
      })
      .from(bookings)
      .where(
        and(
          eq(bookings.venueId, venueId),
          gt(bookings.endsAt, now),
          occupyingBookings(now),
          options.excludeBookingId
            ? ne(bookings.id, options.excludeBookingId)
            : undefined,
        ),
      ),
  ]);

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      phone: venue.phone,
      archivedAt: venue.archivedAt,
      acceptingBookings: venue.acceptingBookings,
      payAtVenueAllowed: venue.payAtVenueAllowed,
      cancellationPolicy: venue.cancellationPolicy,
    },
    courts: courtRows,
    input: {
      courts: courtRows,
      openingHours: hours,
      closures,
      rules,
      bookings: occupying,
      settings: {
        slotMinutes: venue.slotMinutes,
        durationOptionsMinutes: venue.durationOptionsMinutes,
        bookingHorizonDays: venue.bookingHorizonDays,
        minLeadMinutes: venue.minLeadMinutes,
      },
      now,
    },
  };
}

export function isBookableVenue(context: VenueSlotContext): boolean {
  return (
    context.venue.acceptingBookings &&
    context.venue.archivedAt === null &&
    context.courts.length > 0
  );
}

export function requireBookableVenue(
  context: VenueSlotContext | null,
): VenueSlotContext {
  if (!context) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }
  if (context.venue.archivedAt !== null) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Venue is archived",
    });
  }
  if (!context.venue.acceptingBookings) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Venue is not accepting bookings",
    });
  }
  if (context.courts.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This Venue has no Courts to book",
    });
  }
  return context;
}
