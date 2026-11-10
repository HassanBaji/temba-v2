import { TRPCError } from "@trpc/server";

import { messagesFor } from "@repo/i18n/messages";
import { DEFAULT_LOCALE, type Locale } from "@repo/i18n/locale";

import { deleteS3Object, putS3Object } from "#src/storage/s3";

export const GROUP_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const GROUP_IMAGE_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type GroupImageContentType = (typeof GROUP_IMAGE_CONTENT_TYPES)[number];

const JPEG_HEADER = [0xff, 0xd8, 0xff];
const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function bytesMatch(bytes: Uint8Array, header: number[]): boolean {
  if (bytes.length < header.length) {
    return false;
  }
  return header.every((value, index) => bytes[index] === value);
}

function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  const riff =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46;
  const webp =
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  return riff && webp;
}

export function detectGroupImageContentType(
  bytes: Uint8Array,
): GroupImageContentType | null {
  if (bytesMatch(bytes, JPEG_HEADER)) {
    return "image/jpeg";
  }
  if (bytesMatch(bytes, PNG_HEADER)) {
    return "image/png";
  }
  if (isWebp(bytes)) {
    return "image/webp";
  }
  return null;
}

function groupImageObjectPath(groupId: string): string {
  return `group-images/${groupId}/image`;
}

export function decodeGroupImageBase64(
  dataBase64: string,
  locale: Locale = DEFAULT_LOCALE,
): Buffer {
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).group.errors.imageEmpty,
    });
  }
  if (buffer.length > GROUP_IMAGE_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).createGame.image.imageTooLarge,
    });
  }
  return buffer;
}

export function assertGroupImageType(
  bytes: Uint8Array,
  declaredType: GroupImageContentType,
  locale: Locale = DEFAULT_LOCALE,
): GroupImageContentType {
  const detected = detectGroupImageContentType(bytes);
  if (!detected || detected !== declaredType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: messagesFor(locale).createGame.image.imageType,
    });
  }
  return detected;
}

export async function uploadGroupImageObject(input: {
  groupId: string;
  bytes: Buffer;
  contentType: GroupImageContentType;
}): Promise<string> {
  try {
    await putS3Object({
      key: groupImageObjectPath(input.groupId),
      body: input.bytes,
      contentType: input.contentType,
    });
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload Group image",
    });
  }

  return `/api/media/group-images/${input.groupId}/image?v=${Date.now()}`;
}

export async function removeGroupImageObject(groupId: string): Promise<void> {
  try {
    await deleteS3Object(groupImageObjectPath(groupId));
  } catch {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to clear Group image",
    });
  }
}
