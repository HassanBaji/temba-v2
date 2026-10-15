import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venueManagers, venues } from "@repo/db";
import type { DbClient } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

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
      description: true,
      bookingNotes: true,
      acceptingBookings: true,
      slotMinutes: true,
      durationOptionsMinutes: true,
      bookingHorizonDays: true,
      minLeadMinutes: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      courts: {
        columns: { id: true, name: true, createdAt: true, updatedAt: true },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
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

  return {
    ...venue,
    cancellationPolicy: {
      tiers: [{ hoursBefore: 24, refundPercent: 100 }],
      lateRefundPercent: 0,
      customerCancelUntilMinutes: 0,
    },
    openingHours: [],
    closures: [],
    pricingRules: [],
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
