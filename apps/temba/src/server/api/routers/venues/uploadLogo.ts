import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";

import { operatorProcedure } from "~/server/api/trpc";
import { type db } from "~/server/db";
import {
  assertVenueLogoType,
  decodeVenueLogoBase64,
  uploadVenueLogoObject,
  VENUE_LOGO_CONTENT_TYPES,
  type VenueLogoContentType,
} from "~/server/storage/venue-logos";
import { requireVenue } from "~/server/venues/helpers/require-venue";

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

export const uploadLogoProcedure = operatorProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      contentType: z.enum(VENUE_LOGO_CONTENT_TYPES),
      dataBase64: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    return uploadLogo(ctx.db, {
      venueId: input.venueId,
      contentType: input.contentType,
      dataBase64: input.dataBase64,
    });
  });
