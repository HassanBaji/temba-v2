import { TRPCError } from "@trpc/server";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { deleteS3Object, putS3Object } from "#src/storage/s3";
import {
  detectVenueLogoContentType,
  VENUE_LOGO_CONTENT_TYPES,
  type VenueLogoContentType,
} from "#src/storage/venue-logos";

/** The same file rules as every other image (ADR-0016); clients shrink big photos first. */
export const GAME_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export const GAME_PHOTO_CONTENT_TYPES = VENUE_LOGO_CONTENT_TYPES;

export type GamePhotoContentType = VenueLogoContentType;

export function decodeGamePhoto(
  dataBase64: string,
  declaredType: GamePhotoContentType,
  locale: Locale = DEFAULT_LOCALE,
): { bytes: Buffer; contentType: GamePhotoContentType } {
  const errors = messagesFor(locale).gameAlbum.errors;
  const bytes = Buffer.from(dataBase64, "base64");
  if (bytes.length === 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.photoEmpty });
  }
  if (bytes.length > GAME_PHOTO_MAX_BYTES) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.photoTooLarge });
  }
  const detected = detectVenueLogoContentType(bytes);
  if (!detected || detected !== declaredType) {
    throw new TRPCError({ code: "BAD_REQUEST", message: errors.photoType });
  }
  return { bytes, contentType: detected };
}

function gamePhotoObjectPath(gameId: string, photoId: string): string {
  return `game-photos/${gameId}/${photoId}`;
}

/** Each photo id names one immutable object, so the URL needs no `v` query. */
export function gamePhotoUrl(gameId: string, photoId: string): string {
  return `/api/media/game-photos/${gameId}/${photoId}`;
}

export async function uploadGamePhotoObject(
  input: {
    gameId: string;
    photoId: string;
    bytes: Buffer;
    contentType: GamePhotoContentType;
  },
  locale: Locale = DEFAULT_LOCALE,
): Promise<void> {
  try {
    await putS3Object({
      key: gamePhotoObjectPath(input.gameId, input.photoId),
      body: input.bytes,
      contentType: input.contentType,
    });
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: messagesFor(locale).gameAlbum.errors.photoUploadFailed,
    });
  }
}

export async function removeGamePhotoObject(
  gameId: string,
  photoId: string,
): Promise<void> {
  try {
    await deleteS3Object(gamePhotoObjectPath(gameId, photoId));
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete Game photo",
    });
  }
}
