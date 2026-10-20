import { TRPCError } from "@trpc/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { venuePhotos, venues } from "@repo/db";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import { removeVenuePhotoObject } from "#src/storage/venue-photos";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

/** A deleted main or details photo hands its place to the oldest photo left. */
export async function deletePhoto(
  database: DbClient,
  args: { venueId: string; photoId: string; actor: Actor },
) {
  await requireVenue(database, args.venueId);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
  });

  const photo = await database.query.venuePhotos.findFirst({
    where: and(
      eq(venuePhotos.id, args.photoId),
      eq(venuePhotos.venueId, args.venueId),
    ),
    columns: { id: true },
  });
  if (!photo) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Photo not found" });
  }

  await removeVenuePhotoObject(args.venueId, photo.id);

  return database.transaction(async (tx) => {
    await tx.delete(venuePhotos).where(eq(venuePhotos.id, photo.id));
    const oldest = tx
      .select({ id: venuePhotos.id })
      .from(venuePhotos)
      .where(eq(venuePhotos.venueId, args.venueId))
      .orderBy(asc(venuePhotos.createdAt), asc(venuePhotos.id))
      .limit(1);
    const [updated] = await tx
      .update(venues)
      .set({
        coverPhotoId: sql`coalesce(${venues.coverPhotoId}, (${oldest}))`,
        detailPhotoId: sql`coalesce(${venues.detailPhotoId}, (${oldest}))`,
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
        message: "Failed to delete Venue photo",
      });
    }
    return updated;
  });
}

export const deletePhotoProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      photoId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return deletePhoto(ctx.db, {
      venueId: input.venueId,
      photoId: input.photoId,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
    });
  });
