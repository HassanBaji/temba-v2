import { createClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";

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
  return `${groupId}/image`;
}

function createSupabaseAdmin() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function decodeGroupImageBase64(dataBase64: string): Buffer {
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Image file is empty",
    });
  }
  if (buffer.length > GROUP_IMAGE_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Image must be at most 2 MB",
    });
  }
  return buffer;
}

export function assertGroupImageType(
  bytes: Uint8Array,
  declaredType: GroupImageContentType,
): GroupImageContentType {
  const detected = detectGroupImageContentType(bytes);
  if (!detected || detected !== declaredType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Image must be a JPEG, PNG, or WebP image",
    });
  }
  return detected;
}

export async function uploadGroupImageObject(input: {
  groupId: string;
  bytes: Buffer;
  contentType: GroupImageContentType;
}): Promise<string> {
  const supabase = createSupabaseAdmin();
  const path = groupImageObjectPath(input.groupId);
  const { error } = await supabase.storage
    .from(env.SUPABASE_GROUP_IMAGES_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: true,
    });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload Group image",
    });
  }

  const { data } = supabase.storage
    .from(env.SUPABASE_GROUP_IMAGES_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function removeGroupImageObject(groupId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const path = groupImageObjectPath(groupId);
  const { error } = await supabase.storage
    .from(env.SUPABASE_GROUP_IMAGES_BUCKET)
    .remove([path]);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to clear Group image",
    });
  }
}
