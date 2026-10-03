import { and, ne, sql } from "drizzle-orm";

import { venues } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const duplicateVenueMessage =
  "A Venue with this name, city, and country already exists";

export async function venueIdentityTaken(
  database: DbClient,
  name: string,
  city: string,
  country: string,
  exceptId?: string,
) {
  const [row] = await database
    .select({ id: venues.id })
    .from(venues)
    .where(
      and(
        sql`lower(btrim(${venues.name})) = lower(${name})`,
        sql`lower(btrim(${venues.city})) = lower(${city})`,
        sql`lower(btrim(${venues.country})) = lower(${country})`,
        exceptId ? ne(venues.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  return Boolean(row);
}
