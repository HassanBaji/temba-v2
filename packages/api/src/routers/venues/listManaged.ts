import { count, inArray } from "drizzle-orm";

import { courts, venues } from "@repo/db";
import type { DbClient } from "@repo/db";

import { isOperatorPublicMetadata } from "#src/auth/require-operator";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { listManagedVenueIds } from "#src/venues/helpers/require-venue-manager";

export async function listManaged(
  database: DbClient,
  args: {
    userId: string;
    publicMetadata: Record<string, unknown> | undefined;
  },
) {
  const isOperator = isOperatorPublicMetadata(args.publicMetadata);
  const managedIds = isOperator
    ? null
    : await listManagedVenueIds(database, args.userId);

  if (managedIds?.length === 0) {
    return [];
  }

  const rows = await database
    .select({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      country: venues.country,
      logoImageUrl: venues.logoImageUrl,
      acceptingBookings: venues.acceptingBookings,
      archivedAt: venues.archivedAt,
    })
    .from(venues)
    .where(managedIds ? inArray(venues.id, managedIds) : undefined)
    .orderBy(venues.name, venues.city, venues.id);

  const courtCounts = await database
    .select({ venueId: courts.venueId, total: count() })
    .from(courts)
    .where(
      inArray(
        courts.venueId,
        rows.map((row) => row.id),
      ),
    )
    .groupBy(courts.venueId);
  const courtCountByVenue = new Map(
    courtCounts.map((row) => [row.venueId, row.total]),
  );

  return rows.map((row) => ({
    ...row,
    courtCount: courtCountByVenue.get(row.id) ?? 0,
    upcomingBookingCount: 0,
    unsettledCount: 0,
  }));
}

export const listManagedProcedure = protectedProcedure.query(
  async ({ ctx }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return listManaged(ctx.db, {
      userId: appUser.id,
      publicMetadata: await ctx.getPublicMetadata(),
    });
  },
);
