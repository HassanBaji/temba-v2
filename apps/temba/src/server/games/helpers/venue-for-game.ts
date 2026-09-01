import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function venueForGame(database: DbClient, venueId: string) {
  return database.query.venues.findFirst({
    where: eq(venues.id, venueId),
    columns: { id: true, archivedAt: true, name: true },
  });
}
