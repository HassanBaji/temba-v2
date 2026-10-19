import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { slotsForDay } from "@repo/domain/booking-slots";
import {
  productDayKey,
  productDaysBetween,
  zonedDateTimeToInstant,
} from "@repo/domain/product-timezone";
import { type db } from "#src/db";

import {
  isBookableVenue,
  loadVenueSlotContext,
} from "#src/bookings/availability";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export async function venueAvailability(
  database: DbClient,
  args: { venueId: string; day: string; now?: Date },
) {
  const now = args.now ?? new Date();
  const context = await loadVenueSlotContext(database, args.venueId, now);
  if (!context || !isBookableVenue(context)) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const [year, month, date] = args.day.split("-").map(Number);
  const midnight = zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: date ?? Number.NaN,
  });
  if (productDayKey(midnight) !== args.day) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Not a valid day" });
  }
  const daysAhead = productDaysBetween(now, midnight);
  if (daysAhead < 0 || daysAhead >= context.input.settings.bookingHorizonDays) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "That day is outside the booking window",
    });
  }

  const names = new Map(context.courts.map((court) => [court.id, court.name]));
  return {
    day: args.day,
    courts: slotsForDay(context.input, args.day)
      .filter((court) => court.slots.length > 0)
      .map((court) => ({
        id: court.courtId,
        name: names.get(court.courtId) ?? "",
        slots: court.slots,
      })),
  };
}

export const venueAvailabilityProcedure = protectedProcedure
  .input(z.object({ venueId: z.string().uuid(), day: dayKey }))
  .query(async ({ ctx, input }) => venueAvailability(ctx.db, input));
