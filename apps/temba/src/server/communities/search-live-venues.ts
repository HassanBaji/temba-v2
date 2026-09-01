import { and, ilike, or } from "drizzle-orm";

import { venues } from "@repo/db";

import { requireCommunity } from "~/server/communities/helpers/require-community";
import { requireStaff } from "~/server/communities/helpers/require-staff";
import { type LiveVenue } from "~/server/communities/utils";
import { consult, refuseIfFrozen } from "~/server/soft-archive";
import { liveVenuesWhere } from "~/server/soft-archive/adapter";
import { type db } from "~/server/db";

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
