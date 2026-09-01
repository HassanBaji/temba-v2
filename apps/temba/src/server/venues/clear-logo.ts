import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import { removeVenueLogoObject } from "~/server/storage/venue-logos";
import { requireVenue } from "~/server/venues/helpers/require-venue";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function clearLogo(database: DbClient, args: { venueId: string }) {
  await requireVenue(database, args.venueId);
  await removeVenueLogoObject(args.venueId);

  const [updated] = await database
    .update(venues)
    .set({
      logoImageUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(venues.id, args.venueId))
    .returning({
      id: venues.id,
      logoImageUrl: venues.logoImageUrl,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to clear Venue logo",
    });
  }

  return updated;
}
