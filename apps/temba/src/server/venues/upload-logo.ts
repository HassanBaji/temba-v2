import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { venues } from "@repo/db";

import {
  assertVenueLogoType,
  decodeVenueLogoBase64,
  uploadVenueLogoObject,
  type VenueLogoContentType,
} from "~/server/storage/venue-logos";
import { requireVenue } from "~/server/venues/helpers/require-venue";
import { type db } from "~/server/db";

type DbClient = typeof db;

export async function uploadLogo(
  database: DbClient,
  args: {
    venueId: string;
    contentType: VenueLogoContentType;
    dataBase64: string;
  },
) {
  await requireVenue(database, args.venueId);

  const bytes = decodeVenueLogoBase64(args.dataBase64);
  const contentType = assertVenueLogoType(bytes, args.contentType);
  const logoImageUrl = await uploadVenueLogoObject({
    venueId: args.venueId,
    bytes,
    contentType,
  });

  const [updated] = await database
    .update(venues)
    .set({
      logoImageUrl,
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
      message: "Failed to save Venue logo",
    });
  }

  return updated;
}
