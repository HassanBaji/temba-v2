import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import { type db } from "~/server/db";

type DbClient = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireVenue(database: DbClient, id: string) {
  const venue = await database.query.venues.findFirst({
    where: eq(venues.id, id),
    columns: { id: true, archivedAt: true },
  });

  if (!venue) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Venue not found" });
  }

  return venue;
}
