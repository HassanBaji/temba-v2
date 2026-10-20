import { TRPCError } from "@trpc/server";

import { deleteS3Object, putS3Object } from "#src/storage/s3";
import {
  detectVenueLogoContentType,
  VENUE_LOGO_CONTENT_TYPES,
  type VenueLogoContentType,
} from "#src/storage/venue-logos";

/** Photos share the logo's file rules (ADR-0016); the console shrinks big photos before upload. */
export const VENUE_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export const VENUE_PHOTO_CONTENT_TYPES = VENUE_LOGO_CONTENT_TYPES;

export type VenuePhotoContentType = VenueLogoContentType;

export function decodeVenuePhotoBase64(dataBase64: string): Buffer {
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Photo file is empty",
    });
  }
  if (buffer.length > VENUE_PHOTO_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Photo must be at most 2 MB",
    });
  }
  return buffer;
}

export function assertVenuePhotoType(
  bytes: Uint8Array,
  declaredType: VenuePhotoContentType,
): VenuePhotoContentType {
  const detected = detectVenueLogoContentType(bytes);
  if (!detected || detected !== declaredType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Photo must be a JPEG, PNG, or WebP image",
    });
  }
  return detected;
}

function venuePhotoObjectPath(venueId: string, photoId: string): string {
  return `venue-photos/${venueId}/${photoId}`;
}

/** Each photo id names one immutable object, so the URL needs no `v` query. */
export function venuePhotoUrl(venueId: string, photoId: string): string {
  return `/api/media/venue-photos/${venueId}/${photoId}`;
}

export function venuePhotoUrlOrNull(
  venueId: string,
  photoId: string | null,
): string | null {
  return photoId ? venuePhotoUrl(venueId, photoId) : null;
}

export async function uploadVenuePhotoObject(input: {
  venueId: string;
  photoId: string;
  bytes: Buffer;
  contentType: VenuePhotoContentType;
}): Promise<void> {
  try {
    await putS3Object({
      key: venuePhotoObjectPath(input.venueId, input.photoId),
      body: input.bytes,
      contentType: input.contentType,
    });
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload Venue photo",
    });
  }
}

export async function removeVenuePhotoObject(
  venueId: string,
  photoId: string,
): Promise<void> {
  try {
    await deleteS3Object(venuePhotoObjectPath(venueId, photoId));
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to delete Venue photo",
    });
  }
}
