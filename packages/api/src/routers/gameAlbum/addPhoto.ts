import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { gamePhotos, games } from "@repo/db";
import { GAME_ALBUM_SLOTS } from "@repo/domain/game-album";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { resolveAppUser } from "#src/auth/resolve-app-user";
import { type db } from "#src/db";
import { albumAccess, assertMayContribute } from "#src/game-album/access";
import {
  decodeGamePhoto,
  GAME_PHOTO_CONTENT_TYPES,
  gamePhotoUrl,
  removeGamePhotoObject,
  uploadGamePhotoObject,
  type GamePhotoContentType,
} from "#src/storage/game-photos";
import { protectedProcedure } from "#src/trpc";

type DbClient = typeof db;
type DbOrTx = DbClient | Parameters<Parameters<DbClient["transaction"]>[0]>[0];

async function requireRoom(database: DbOrTx, gameId: string, locale: Locale) {
  const [existing] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(gamePhotos)
    .where(eq(gamePhotos.gameId, gameId));
  if ((existing?.count ?? 0) >= GAME_ALBUM_SLOTS) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).gameAlbum.errors.albumFull,
    });
  }
}

/**
 * A player adds one photo to a played Game's Album. The cap of six is checked
 * before the upload and again under the Game row lock; a photo that loses the
 * race is deleted from the bucket.
 */
export async function addPhoto(
  database: DbClient,
  args: {
    gameId: string;
    userId: string;
    contentType: GamePhotoContentType;
    dataBase64: string;
    locale?: Locale;
  },
) {
  const locale = args.locale ?? DEFAULT_LOCALE;
  const access = await albumAccess(database, { ...args, locale });
  assertMayContribute(access, locale);
  await requireRoom(database, access.game.id, locale);

  const { bytes, contentType } = decodeGamePhoto(
    args.dataBase64,
    args.contentType,
    locale,
  );
  const photoId = crypto.randomUUID();
  await uploadGamePhotoObject(
    { gameId: access.game.id, photoId, bytes, contentType },
    locale,
  );

  const photo = await database
    .transaction(async (tx) => {
      await tx
        .select({ id: games.id })
        .from(games)
        .where(eq(games.id, access.game.id))
        .for("update");
      await requireRoom(tx, access.game.id, locale);
      const [inserted] = await tx
        .insert(gamePhotos)
        .values({
          id: photoId,
          gameId: access.game.id,
          uploaderUserId: args.userId,
        })
        .returning({ id: gamePhotos.id, createdAt: gamePhotos.createdAt });
      return inserted;
    })
    .catch(async (error: unknown) => {
      await removeGamePhotoObject(access.game.id, photoId).catch(
        () => undefined,
      );
      throw error;
    });

  if (!photo) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: messagesFor(locale).gameAlbum.errors.photoUploadFailed,
    });
  }

  return {
    id: photo.id,
    url: gamePhotoUrl(access.game.id, photo.id),
    createdAt: photo.createdAt,
  };
}

export const addPhotoProcedure = protectedProcedure
  .input(
    z.object({
      gameId: z.string().uuid(),
      contentType: z.enum(GAME_PHOTO_CONTENT_TYPES),
      dataBase64: z.string().min(1),
    }),
  )
  .mutation(async ({ ctx, input }) => {
    const appUser = await resolveAppUser(ctx.userId);
    return addPhoto(ctx.db, {
      gameId: input.gameId,
      userId: appUser.id,
      contentType: input.contentType,
      dataBase64: input.dataBase64,
      locale: ctx.locale,
    });
  });
