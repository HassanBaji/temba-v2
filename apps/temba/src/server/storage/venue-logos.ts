import { createClient } from "@supabase/supabase-js";
import { TRPCError } from "@trpc/server";

import { env } from "~/env";

export const VENUE_LOGO_MAX_BYTES = 2 * 1024 * 1024;

export const VENUE_LOGO_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type VenueLogoContentType = (typeof VENUE_LOGO_CONTENT_TYPES)[number];

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

export function detectVenueLogoContentType(
  bytes: Uint8Array,
): VenueLogoContentType | null {
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

function venueLogoObjectPath(venueId: string): string {
  return `${venueId}/logo`;
}

function createSupabaseAdmin() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function decodeVenueLogoBase64(dataBase64: string): Buffer {
  const buffer = Buffer.from(dataBase64, "base64");
  if (buffer.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Logo file is empty",
    });
  }
  if (buffer.length > VENUE_LOGO_MAX_BYTES) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Logo must be at most 2 MB",
    });
  }
  return buffer;
}

export function assertVenueLogoType(
  bytes: Uint8Array,
  declaredType: VenueLogoContentType,
): VenueLogoContentType {
  const detected = detectVenueLogoContentType(bytes);
  if (!detected || detected !== declaredType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Logo must be a JPEG, PNG, or WebP image",
    });
  }
  return detected;
}

export async function uploadVenueLogoObject(input: {
  venueId: string;
  bytes: Buffer;
  contentType: VenueLogoContentType;
}): Promise<string> {
  const supabase = createSupabaseAdmin();
  const path = venueLogoObjectPath(input.venueId);
  const { error } = await supabase.storage
    .from(env.SUPABASE_VENUE_LOGOS_BUCKET)
    .upload(path, input.bytes, {
      contentType: input.contentType,
      upsert: true,
    });

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload Venue logo",
    });
  }

  const { data } = supabase.storage
    .from(env.SUPABASE_VENUE_LOGOS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function removeVenueLogoObject(venueId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const path = venueLogoObjectPath(venueId);
  const { error } = await supabase.storage
    .from(env.SUPABASE_VENUE_LOGOS_BUCKET)
    .remove([path]);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to clear Venue logo",
    });
  }
}
