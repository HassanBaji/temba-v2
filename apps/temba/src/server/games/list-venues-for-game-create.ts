import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import { type db } from "~/server/db";
import { loadGameCreateVenueContext } from "~/server/games/helpers/load-game-create-venue-context";
import { consult } from "~/server/soft-archive";
import { liveVenuesWhere } from "~/server/soft-archive/adapter";
import type {
  GameCreateGroupKind,
  GameCreateVenueOption,
} from "~/server/games/utils";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function listVenuesForGameCreate(
  database: DbClient,
  groupId: string | undefined,
): Promise<{
  locked: boolean;
  groupKind: GameCreateGroupKind;
  venues: GameCreateVenueOption[];
}> {
  const context = await loadGameCreateVenueContext(database, groupId);

  if (context.locked && context.linkedVenueId) {
    const venue = await database.query.venues.findFirst({
      where: eq(venues.id, context.linkedVenueId),
      columns: {
        id: true,
        name: true,
        city: true,
        country: true,
        archivedAt: true,
      },
      with: {
        courts: {
          columns: { id: true, name: true },
          orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
        },
      },
    });
    if (!venue) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Venue not found",
      });
    }

    const archived = consult({ archivedAt: venue.archivedAt }).freeze(
      "catalog",
    );
    return {
      locked: true,
      groupKind: context.groupKind,
      venues: [
        {
          id: venue.id,
          name: venue.name,
          city: venue.city,
          country: venue.country,
          archivedAt: venue.archivedAt,
          courts: archived
            ? []
            : venue.courts.map((court) => ({ id: court.id, name: court.name })),
        },
      ],
    };
  }

  const rows = await database.query.venues.findMany({
    where: liveVenuesWhere(),
    columns: {
      id: true,
      name: true,
      city: true,
      country: true,
      archivedAt: true,
    },
    with: {
      courts: {
        columns: { id: true, name: true },
        orderBy: (table, { asc }) => [asc(table.name), asc(table.id)],
      },
    },
    orderBy: (table, { asc }) => [
      asc(table.name),
      asc(table.city),
      asc(table.country),
      asc(table.id),
    ],
  });

  return {
    locked: false,
    groupKind: context.groupKind,
    venues: rows.map((venue) => ({
      id: venue.id,
      name: venue.name,
      city: venue.city,
      country: venue.country,
      archivedAt: venue.archivedAt,
      courts: venue.courts.map((court) => ({ id: court.id, name: court.name })),
    })),
  };
}
