import type { DbClient, DbTx } from "@repo/db";
import { and, eq, exists, inArray } from "drizzle-orm";

import { courts, venues } from "@repo/db";
import type { Sport } from "@repo/domain/sport";

import { liveVenuesWhere } from "#src/soft-archive/adapter";

type DbOrTx = DbClient | DbTx;

/** Live Venues with at least one Court of the sport, by name; narrowed to `venueIds` when given. */
export async function liveVenuesOfferingSport(
  database: DbOrTx,
  sport: Sport,
  venueIds?: readonly string[],
) {
  if (venueIds?.length === 0) {
    return [];
  }
  return database
    .select({ id: venues.id, name: venues.name, city: venues.city })
    .from(venues)
    .where(
      and(
        liveVenuesWhere(),
        venueIds ? inArray(venues.id, [...venueIds]) : undefined,
        exists(
          database
            .select({ id: courts.id })
            .from(courts)
            .where(and(eq(courts.venueId, venues.id), eq(courts.sport, sport))),
        ),
      ),
    )
    .orderBy(venues.name, venues.id);
}
