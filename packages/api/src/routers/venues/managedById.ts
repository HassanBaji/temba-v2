import { TRPCError } from "@trpc/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import {
  venueClosures,
  venueManagers,
  venueOpeningHours,
  venuePricingRules,
  venues,
} from "@repo/db";
import type { DbClient } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { paymentProvider } from "#src/payments/index";
import { protectedProcedure } from "#src/trpc";
import { venuePhotoUrl, venuePhotoUrlOrNull } from "#src/storage/venue-photos";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

const CLOSURE_WINDOW_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function managedVenueById(
  database: DbClient,
  args: {
    venueId: string;
    userId: string;
    publicMetadata: Record<string, unknown> | undefined;
  },
) {
  await requireVenueManager(database, args);

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      phone: true,
      website: true,
      logoImageUrl: true,
      coverPhotoId: true,
      detailPhotoId: true,
      description: true,
      bookingNotes: true,
      acceptingBookings: true,
      slotMinutes: true,
      durationOptionsMinutes: true,
      bookingHorizonDays: true,
      minLeadMinutes: true,
      payAtVenueAllowed: true,
      cancellationPolicy: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      courts: {
        columns: { id: true, name: true, createdAt: true, updatedAt: true },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
      photos: {
        columns: { id: true, createdAt: true },
        orderBy: (table, { asc }) => [asc(table.createdAt), asc(table.id)],
      },
    },
  });

  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const managerRows = await database.query.venueManagers.findMany({
    where: eq(venueManagers.venueId, venue.id),
    columns: { id: true, userId: true, createdAt: true },
    with: {
      user: { columns: { id: true, name: true, username: true, image: true } },
    },
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });

  const openingHours = await database
    .select({
      id: venueOpeningHours.id,
      weekday: venueOpeningHours.weekday,
      opensAtMinutes: venueOpeningHours.opensAtMinutes,
      closesAtMinutes: venueOpeningHours.closesAtMinutes,
    })
    .from(venueOpeningHours)
    .where(eq(venueOpeningHours.venueId, venue.id))
    .orderBy(
      asc(venueOpeningHours.weekday),
      asc(venueOpeningHours.opensAtMinutes),
    );

  const closureHorizon = new Date(
    Date.now() + CLOSURE_WINDOW_DAYS * MS_PER_DAY,
  );
  const closures = await database
    .select({
      id: venueClosures.id,
      courtId: venueClosures.courtId,
      startsAt: venueClosures.startsAt,
      endsAt: venueClosures.endsAt,
      reason: venueClosures.reason,
    })
    .from(venueClosures)
    .where(
      and(
        eq(venueClosures.venueId, venue.id),
        gte(venueClosures.endsAt, new Date()),
        lte(venueClosures.startsAt, closureHorizon),
      ),
    )
    .orderBy(asc(venueClosures.startsAt));

  const pricingRules = await database
    .select({
      id: venuePricingRules.id,
      courtId: venuePricingRules.courtId,
      weekdays: venuePricingRules.weekdays,
      startMinutes: venuePricingRules.startMinutes,
      endMinutes: venuePricingRules.endMinutes,
      hourlyRateFils: venuePricingRules.hourlyRateFils,
      label: venuePricingRules.label,
    })
    .from(venuePricingRules)
    .where(eq(venuePricingRules.venueId, venue.id))
    .orderBy(
      asc(venuePricingRules.startMinutes),
      asc(venuePricingRules.createdAt),
    );

  return {
    ...venue,
    onlinePaymentAvailable: paymentProvider().id !== "manual",
    photos: venue.photos.map((photo) => ({
      ...photo,
      imageUrl: venuePhotoUrl(venue.id, photo.id),
    })),
    coverImageUrl: venuePhotoUrlOrNull(venue.id, venue.coverPhotoId),
    detailImageUrl: venuePhotoUrlOrNull(venue.id, venue.detailPhotoId),
    openingHours,
    closures,
    pricingRules,
    managers: managerRows.map((row) => ({
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      username: row.user.username,
      image: row.user.image,
      createdAt: row.createdAt,
    })),
  };
}

export const managedById = protectedProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return managedVenueById(ctx.db, {
      venueId: input.venueId,
      userId: appUser.id,
      publicMetadata: await ctx.getPublicMetadata(),
    });
  });
