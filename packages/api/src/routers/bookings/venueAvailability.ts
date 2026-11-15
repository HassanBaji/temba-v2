import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { slotsForDay } from "@repo/domain/booking-slots";
import {
  productDayKey,
  productDaysBetween,
  zonedDateTimeToInstant,
} from "@repo/domain/product-timezone";
import type { Sport } from "@repo/domain/sport";
import { sportSchema } from "@repo/validators/sport";
import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
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
  args: {
    venueId: string;
    day: string;
    sport?: Sport;
    now?: Date;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const now = args.now ?? new Date();
  const context = await loadVenueSlotContext(database, args.venueId, now);
  if (!context || !isBookableVenue(context)) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: messagesFor(locale).venue.errors.notFound,
    });
  }

  const [year, month, date] = args.day.split("-").map(Number);
  const midnight = zonedDateTimeToInstant({
    year: year ?? Number.NaN,
    month: month ?? Number.NaN,
    day: date ?? Number.NaN,
  });
  if (productDayKey(midnight) !== args.day) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).booking.errors.invalidDay,
    });
  }
  const daysAhead = productDaysBetween(now, midnight);
  if (daysAhead < 0 || daysAhead >= context.input.settings.bookingHorizonDays) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).booking.errors.outsideWindow,
    });
  }

  const shown = context.courts.filter(
    (court) => !args.sport || court.sport === args.sport,
  );
  const names = new Map(shown.map((court) => [court.id, court.name]));
  return {
    day: args.day,
    courts: slotsForDay(context.input, args.day)
      .filter((court) => names.has(court.courtId) && court.slots.length > 0)
      .map((court) => ({
        id: court.courtId,
        name: names.get(court.courtId) ?? "",
        slots: court.slots,
      })),
  };
}

export const venueAvailabilityProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      day: dayKey,
      sport: sportSchema.optional(),
    }),
  )
  .query(async ({ ctx, input }) =>
    venueAvailability(ctx.db, { ...input, locale: ctx.locale }),
  );
