import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";

import { operatorProcedure } from "#src/trpc";
import { type db } from "#src/db";
import { removeVenueLogoObject } from "#src/storage/venue-logos";
import { requireVenue } from "#src/venues/helpers/require-venue";

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

export const clearLogoProcedure = operatorProcedure
  .input(z.object({ venueId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    return clearLogo(ctx.db, { venueId: input.venueId });
  });
