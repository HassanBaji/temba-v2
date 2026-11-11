import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { venuePhotos, venues } from "@repo/db";
import type { DbTx } from "@repo/db";
import { VENUE_PHOTO_LIMIT } from "@repo/domain/venue-photos";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { protectedProcedure } from "#src/trpc";
import {
  assertVenuePhotoType,
  decodeVenuePhotoBase64,
  removeVenuePhotoObject,
  uploadVenuePhotoObject,
  VENUE_PHOTO_CONTENT_TYPES,
  venuePhotoUrl,
  type VenuePhotoContentType,
} from "#src/storage/venue-photos";
import { requireVenue } from "#src/venues/helpers/require-venue";
import { requireVenueManager } from "#src/venues/helpers/require-venue-manager";

type DbClient = typeof db;

type Actor = {
  userId: string;
  publicMetadata: Record<string, unknown> | undefined;
};

async function requirePhotoRoom(
  database: DbClient | DbTx,
  venueId: string,
  locale: Locale = DEFAULT_LOCALE,
) {
  const [existing] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(venuePhotos)
    .where(eq(venuePhotos.venueId, venueId));
  if ((existing?.count ?? 0) >= VENUE_PHOTO_LIMIT) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).venue.errors.photoLimit(VENUE_PHOTO_LIMIT),
    });
  }
}

/** The first photo becomes both the main and the details photo until the manager picks others. */
export async function uploadPhoto(
  database: DbClient,
  args: {
    venueId: string;
    contentType: VenuePhotoContentType;
    dataBase64: string;
    actor: Actor;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  await requireVenue(database, args.venueId, locale);
  await requireVenueManager(database, {
    venueId: args.venueId,
    ...args.actor,
    locale,
  });

  await requirePhotoRoom(database, args.venueId, locale);

  const bytes = decodeVenuePhotoBase64(args.dataBase64, locale);
  const contentType = assertVenuePhotoType(bytes, args.contentType, locale);
  const photoId = crypto.randomUUID();
  await uploadVenuePhotoObject({
    venueId: args.venueId,
    photoId,
    bytes,
    contentType,
  });

  const photo = await database
    .transaction(async (tx) => {
      await tx
        .select({ id: venues.id })
        .from(venues)
        .where(eq(venues.id, args.venueId))
        .for("update");
      await requirePhotoRoom(tx, args.venueId, locale);
      const [inserted] = await tx
        .insert(venuePhotos)
        .values({ id: photoId, venueId: args.venueId })
        .returning({ id: venuePhotos.id, createdAt: venuePhotos.createdAt });
      await tx
        .update(venues)
        .set({
          coverPhotoId: sql`coalesce(${venues.coverPhotoId}, ${photoId}::uuid)`,
          detailPhotoId: sql`coalesce(${venues.detailPhotoId}, ${photoId}::uuid)`,
          updatedAt: new Date(),
        })
        .where(eq(venues.id, args.venueId));
      return inserted;
    })
    .catch(async (error: unknown) => {
      await removeVenuePhotoObject(args.venueId, photoId).catch(
        () => undefined,
      );
      throw error;
    });

  if (!photo) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to save Venue photo",
    });
  }

  return {
    id: photo.id,
    imageUrl: venuePhotoUrl(args.venueId, photo.id),
    createdAt: photo.createdAt,
  };
}

export const uploadPhotoProcedure = protectedProcedure
  .input(
    z.object({
      venueId: z.string().uuid(),
      contentType: z.enum(VENUE_PHOTO_CONTENT_TYPES),
      dataBase64: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return uploadPhoto(ctx.db, {
      venueId: input.venueId,
      contentType: input.contentType,
      dataBase64: input.dataBase64,
      actor: {
        userId: appUser.id,
        publicMetadata: await ctx.getPublicMetadata(),
      },
      locale: ctx.locale,
    });
  });
