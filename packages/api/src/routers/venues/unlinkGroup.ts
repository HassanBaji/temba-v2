import { z } from "zod";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import { unlinkGroupFromVenueCommunity } from "#src/venue-community/unlink-group";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

export async function unlinkGroup(
  database: DbClient,
  args: {
    venueId: string;
    groupId: string;
    actor: {
      userId: string;
      publicMetadata: Record<string, unknown> | undefined;
    };
  },
) {
  const venue = await requireVenue(database, args.venueId);
  await requireVenueManager(database, { venueId: venue.id, ...args.actor });
  return unlinkGroupFromVenueCommunity(database, {
    groupId: args.groupId,
    venueId: venue.id,
  });
}

export const unlinkGroupProcedure = protectedProcedure
  .input(z.object({ venueId: z.string().uuid(), groupId: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return unlinkGroup(ctx.db, {
      venueId: input.venueId,
      groupId: input.groupId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
