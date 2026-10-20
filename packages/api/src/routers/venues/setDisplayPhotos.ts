import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import { venuePhotos, venues } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

/**
 * Picks the main photo (the Venue list card) and the details photo (the top
 * of the Venue screen). An omitted field stays as it is. Neither is empty
 * while the Venue has a photo: upload and delete fill an empty one.
 */
export async function setDisplayPhotos(
  database: DbClient,
  args: {
    venueId: string;
    coverPhotoId?: string;
    detailPhotoId?: string;
    actor: Actor;
  },
) {
  await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

  const picked = [args.coverPhotoId, args.detailPhotoId].filter(
    (id) => id !== undefined,
  );
  if (picked.length > 0) {
    const found = await database
      .select({ id: venuePhotos.id })
      .from(venuePhotos)
      .where(
        and(
          eq(venuePhotos.venueId, args.venueId),
          inArray(venuePhotos.id, picked),
        ),
      );
    const foundIds = new Set(found.map((row) => row.id));
    if (picked.some((id) => !foundIds.has(id))) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
    }
  }

  const [updated] = await database
    .update(venues)
    .set({
      ...(args.coverPhotoId ? { coverPhotoId: args.coverPhotoId } : {}),
      ...(args.detailPhotoId ? { detailPhotoId: args.detailPhotoId } : {}),
      updatedAt: new Date(),
    })
    .where(eq(venues.id, args.venueId))
    .returning({
      id: venues.id,
      coverPhotoId: venues.coverPhotoId,
      detailPhotoId: venues.detailPhotoId,
    });

  if (!updated) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Venue photos",
    });
  }

  return updated;
}

export const setDisplayPhotosProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      coverPhotoId: z.string().uuid().optional(),
      detailPhotoId: z.string().uuid().optional(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return setDisplayPhotos(ctx.db, {
      venueId: input.venueId,
      coverPhotoId: input.coverPhotoId,
      detailPhotoId: input.detailPhotoId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
