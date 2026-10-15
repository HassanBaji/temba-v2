import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { venues } from "@repo/db";

import { type db } from "#src/db";
import { resolveAppUser } from "#src/auth/resolve-app-user";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

const contactField = z
  .string()
  .trim()
  .max(255)
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

export async function updateVenueDetails(
  database: DbClient,
  args: {
    venueId: string;
    userId: string;
    publicMetadata: Record<string, unknown> | undefined;
    phone?: string | null;
    website?: string | null;
  },
) {
  await requireVenue(database, args.venueId);
  await requireVenueManager(database, args);

  const [updated] = await database
    .update(venues)
    .set({
      ...(args.phone !== undefined ? { phone: args.phone } : {}),
      ...(args.website !== undefined ? { website: args.website } : {}),
      updatedAt: new Date(),
    })
    .where(eq(venues.id, args.venueId))
    .returning({
      id: venues.id,
      name: venues.name,
      city: venues.city,
      country: venues.country,
      phone: venues.phone,
      website: venues.website,
      updatedAt: venues.updatedAt,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to update Venue details",
    });
  }

  return updated;
}

export const updateDetails = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      phone: contactField,
      website: contactField,
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return updateVenueDetails(ctx.db, {
      venueId: input.venueId,
      userId: appUser.id,
      publicMetadata: await ctx.getPublicMetadata(),
      phone: input.phone,
      website: input.website,
    });
  });
