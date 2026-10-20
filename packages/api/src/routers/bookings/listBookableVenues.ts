import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";

import { courts, venueOpeningHours, venuePricingRules, venues } from "@repo/db";
import { zonedParts } from "@repo/domain/product-timezone";
import { type db } from "#src/db";

import { venuePhotoUrlOrNull } from "#src/storage/venue-photos";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

export async function listBookableVenues(
  database: DbClient,
  args: { city?: string; now?: Date },
) {
  const now = args.now ?? new Date();
  const city = args.city?.trim();

  const candidates = await database
    .select({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      country: venues.country,
      logoImageUrl: venues.logoImageUrl,
      coverPhotoId: venues.coverPhotoId,
    })
    .from(venues)
    .where(
      and(
        eq(venues.acceptingBookings, true),
        isNull(venues.archivedAt),
        city ? sql`lower(btrim(${venues.city})) = lower(${city})` : undefined,
      ),
    )
    .orderBy(venues.name, venues.id);
  if (candidates.length === 0) {
    return [];
  }

  const ids = candidates.map((venue) => venue.id);
  const { year, month, day } = zonedParts(now);
  const todayWeekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  const [courtCounts, lowestRates, hours] = await Promise.all([
    database
      .select({ venueId: courts.venueId, count: sql<number>`count(*)::int` })
      .from(courts)
      .where(inArray(courts.venueId, ids))
      .groupBy(courts.venueId),
    database
      .select({
        venueId: venuePricingRules.venueId,
        rate: sql<number>`min(${venuePricingRules.hourlyRateFils})::int`,
      })
      .from(venuePricingRules)
      .where(inArray(venuePricingRules.venueId, ids))
      .groupBy(venuePricingRules.venueId),
    database
      .select({
        venueId: venueOpeningHours.venueId,
        opensAtMinutes: venueOpeningHours.opensAtMinutes,
        closesAtMinutes: venueOpeningHours.closesAtMinutes,
      })
      .from(venueOpeningHours)
      .where(
        and(
          inArray(venueOpeningHours.venueId, ids),
          eq(venueOpeningHours.weekday, todayWeekday),
        ),
      )
      .orderBy(venueOpeningHours.opensAtMinutes),
  ]);

  const courtCount = new Map(
    courtCounts.map((row) => [row.venueId, row.count]),
  );
  const lowestRate = new Map(lowestRates.map((row) => [row.venueId, row.rate]));

  return candidates.flatMap(({ coverPhotoId, ...venue }) => {
    const count = courtCount.get(venue.id) ?? 0;
    const fromHourlyRateFils = lowestRate.get(venue.id);
    if (count === 0 || fromHourlyRateFils === undefined) {
      return [];
    }
    return [
      {
        ...venue,
        coverImageUrl: venuePhotoUrlOrNull(venue.id, coverPhotoId),
        courtCount: count,
        fromHourlyRateFils,
        todayOpen: hours
          .filter((window) => window.venueId === venue.id)
          .map(({ opensAtMinutes, closesAtMinutes }) => ({
            opensAtMinutes,
            closesAtMinutes,
          })),
      },
    ];
  });
}

export const listBookableVenuesProcedure = protectedProcedure
  .input(z.object({ city: z.string().trim().min(1).max(255).optional() }))
  .query(async ({ ctx, input }) => listBookableVenues(ctx.db, input));
