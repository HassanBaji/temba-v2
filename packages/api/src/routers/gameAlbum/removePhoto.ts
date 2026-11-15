import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { gamePhotos } from "@repo/db";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { albumAccess } from "#src/game-album/access";
import { removeGamePhotoObject } from "#src/storage/game-photos";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;

/** Whoever added a photo removes it; an Organizer removes any. */
export async function removePhoto(
  database: DbClient,
  args: { gameId: string; photoId: string; userId: string; locale?: Locale },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const errors = messagesFor(locale).gameAlbum.errors;
  const access = await albumAccess(database, { ...args, locale });
  const photo = await database.query.gamePhotos.findFirst({
    where: and(
      eq(gamePhotos.id, args.photoId),
      eq(gamePhotos.gameId, access.game.id),
    ),
    columns: { id: true, uploaderUserId: true },
  });
  if (!photo) {
    throw new TRPCError({ code: "NOT_FOUND", message: errors.photoNotFound });
  }
  if (photo.uploaderUserId !== args.userId && !access.isOrganizer) {
    throw new TRPCError({ code: "FORBIDDEN", message: errors.notYourPhoto });
  }

  await removeGamePhotoObject(access.game.id, photo.id);
  await database.delete(gamePhotos).where(eq(gamePhotos.id, photo.id));
  return { id: photo.id };
}

export const removePhotoProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      photoId: z.string().uuid(),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return removePhoto(ctx.db, {
      gameId: input.gameId,
      photoId: input.photoId,
      userId: appUser.id,
      locale: ctx.locale,
    });
  });
