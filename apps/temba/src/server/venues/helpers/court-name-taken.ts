import { and, eq, ne, sql } from "drizzle-orm";

import { courts } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const duplicateCourtMessage =
  "A Court with this name already exists on this Venue";

export async function courtNameTaken(
  database: DbClient,
  venueId: string,
  name: string,
  exceptId?: string,
) {
  const [row] = await database
    .select({ id: courts.id })
    .from(courts)
    .where(
      and(
        eq(courts.venueId, venueId),
        sql`lower(btrim(${courts.name})) = lower(${name})`,
        exceptId ? ne(courts.id, exceptId) : undefined,
      ),
    )
    .limit(1);

  return Boolean(row);
}
