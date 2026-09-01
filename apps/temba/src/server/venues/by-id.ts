import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { communities, venues } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function venueById(database: DbClient, args: { venueId: string }) {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, args.venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      logoImageUrl: true,
      archivedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    with: {
      courts: {
        columns: {
          id: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: (table, { asc }) => [asc(table.createdAt)],
      },
    },
  });

  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  const linkedCommunities = await database.query.communities.findMany({
    where: eq(communities.venueId, venue.id),
    columns: {
      id: true,
      name: true,
      archivedAt: true,
    },
    orderBy: (table, { asc }) => [asc(table.name)],
  });

  return {
    ...venue,
    linkedCommunities,
  };
}
