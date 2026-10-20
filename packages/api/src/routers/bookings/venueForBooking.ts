import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";
import { describeCancellationPolicy } from "@repo/domain/booking-refund";
import { type db } from "#src/db";

import {
  isBookableVenue,
  loadVenueSlotContext,
} from "#src/bookings/availability";
import { paymentProvider } from "#src/payments/index";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function venueForBooking(
  database: DbClient,
  args: { venueId: string; now?: Date },
) {
  const now = args.now ?? new Date();
  const context = await loadVenueSlotContext(database, args.venueId, now);
  if (!context || !isBookableVenue(context)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      phone: true,
      website: true,
      logoImageUrl: true,
      latitude: true,
      longitude: true,
      description: true,
      bookingNotes: true,
      cancellationPolicy: true,
    },
  });
  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const { settings } = context.input;
  const openingHours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    windows: context.input.openingHours
      .filter((window) => window.weekday === weekday)
      .sort((a, b) => a.opensAtMinutes - b.opensAtMinutes)
      .map(({ opensAtMinutes, closesAtMinutes }) => ({
        opensAtMinutes,
        closesAtMinutes,
      })),
  }));

  return {
    ...venue,
    courts: context.courts,
    openingHours,
    slotMinutes: settings.slotMinutes,
    durationOptionsMinutes: [...settings.durationOptionsMinutes],
    bookingHorizonDays: settings.bookingHorizonDays,
    minLeadMinutes: settings.minLeadMinutes,
    cancellationPolicyLines: describeCancellationPolicy(
      venue.cancellationPolicy,
    ),
    payment: {
      mode:
        paymentProvider().id === "manual"
          ? ("at_venue" as const)
          : ("online" as const),
    },
  };
}

export const venueForBookingProcedure = protectedProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .query(async ({ ctx, input }) => venueForBooking(ctx.db, input));
