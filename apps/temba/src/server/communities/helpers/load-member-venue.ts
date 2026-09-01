import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db;

export async function loadMemberVenue(
  database: DbClient,
  venueId: string | null,
) {
  if (!venueId) {
    return null;
  }

  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      logoImageUrl: true,
      archivedAt: true,
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
  });

  return venue ?? null;
}
