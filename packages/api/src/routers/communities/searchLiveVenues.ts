import { and, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";

import { protectedProcedure } from "#src/trpc";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { requireCommunity } from "#src/communities/helpers/require-community";
import { requireStaff } from "#src/communities/helpers/require-staff";
import { type LiveVenue } from "#src/communities/utils";
import { type db } from "#src/db";
import { consult, refuseIfFrozen } from "#src/soft-archive";
import { liveVenuesWhere } from "#src/soft-archive/adapter";

type DbClient = typeof db;

export async function searchLiveVenues(
  database: DbClient,
  args: { communityId: string; userId: string; query: string },
): Promise<LiveVenue[]> {
  const community = await requireCommunity(database, args.communityId);
  await requireStaff(
    database,
    community.id,
    args.userId,
    "Only Owner or Admin can search Venues",
  );

  refuseIfFrozen(consult({ archivedAt: community.archivedAt }), "host", {
    frozenMessage: "Cannot search Venues for an archived Community",
  });

  const query = args.query;
  const rows = await database.query.venues.findMany({
    where: and(
      liveVenuesWhere(),
      query
        ? or(
            ilike(venues.name, `%${query}%`),
            ilike(venues.city, `%${query}%`),
            ilike(venues.country, `%${query}%`),
          )
        : undefined,
    ),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      logoImageUrl: true,
    },
    with: {
      courts: {
        columns: {
          id: true,
          name: true,
          createdAt: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
    },
    orderBy: (table, { asc }) => [
      asc(table.name),
      asc(table.city),
      asc(table.country),
    ],
  });

  return rows;
}

export const searchLiveVenuesProcedure = protectedProcedure
  .input(
    z.object({
      communityId: z.string().uuid(),
      query: z.string().trim().max(255),
    }),
  )
  .query(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return searchLiveVenues(ctx.db, {
      communityId: input.communityId,
      userId: appUser.id,
      query: input.query,
    });
  });
