import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  getS3BucketName,
  getS3Client,
  MEDIA_CACHE_CONTROL,
} from "#src/storage/s3";

/** Rows store `/api/media/<key>?v=<unixMs>`; the path names the bucket object (ADR-0034). */
const STORED_MEDIA_PREFIX = "/api/media/";
const MEDIA_KEY = /^(group-images|venue-logos|venue-photos)\/[^/]+\/[^/]+$/;

/**
 * Every URL signed inside one window carries the same signing date, so a client
 * sees one stable URL per object and version and its cache keeps working. SigV4
 * caps expiry at seven days; the window is shorter so the last URL handed out in
 * a window still has a day left.
 */
export const MEDIA_URL_EXPIRES_SECONDS = 7 * 24 * 60 * 60;
export const MEDIA_URL_WINDOW_MS = 6 * 24 * 60 * 60 * 1000;

const MAX_MEMOIZED = 10_000;
const memo = new Map<string, Promise<string>>();

export function storedMediaObject(
  stored: string,
): { key: string; version: string | null } | null {
  if (!stored.startsWith(STORED_MEDIA_PREFIX)) {
    return null;
  }
  const url = new URL(stored, "http://stored.invalid");
  const key = url.pathname.slice(STORED_MEDIA_PREFIX.length);
  if (!MEDIA_KEY.test(key)) {
    return null;
  }
  return { key, version: url.searchParams.get("v") };
}

export function mediaSigningDate(now: number): Date {
  return new Date(Math.floor(now / MEDIA_URL_WINDOW_MS) * MEDIA_URL_WINDOW_MS);
}

async function presign(
  key: string,
  version: string | null,
  signingDate: Date,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getS3BucketName(),
    Key: key,
    ResponseCacheControl: MEDIA_CACHE_CONTROL,
  });
  if (version) {
    // Replacing an image keeps its key, so the version rides along as a signed
    // query parameter to give the new image a new URL.
    command.middlewareStack.add(
      (next) => (args) => {
        const request = args.request as { query?: Record<string, string> };
        if (request.query) {
          request.query.v = version;
        }
        return next(args);
      },
      { step: "build", name: "mediaVersionQuery" },
    );
  }
  return getSignedUrl(getS3Client(), command, {
    expiresIn: MEDIA_URL_EXPIRES_SECONDS,
    signingDate,
  });
}

/** A presigned bucket URL for a stored media path; any other string comes back unchanged. */
export async function signMediaUrl(
  stored: string,
  now = Date.now(),
): Promise<string> {
  const object = storedMediaObject(stored);
  if (!object) {
    return stored;
  }
  const signingDate = mediaSigningDate(now);
  const memoKey = `${signingDate.getTime()} ${stored}`;
  const cached = memo.get(memoKey);
  if (cached) {
    return cached;
  }
  if (memo.size >= MAX_MEMOIZED) {
    memo.clear();
  }
  const signed = presign(object.key, object.version, signingDate);
  memo.set(memoKey, signed);
  signed.catch(() => memo.delete(memoKey));
  return signed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function collectStoredMediaPaths(value: unknown, into: Set<string>): void {
  if (typeof value === "string") {
    if (storedMediaObject(value)) {
      into.add(value);
    }
  } else if (Array.isArray(value)) {
    for (const item of value) {
      collectStoredMediaPaths(item, into);
    }
  } else if (isPlainObject(value)) {
    for (const item of Object.values(value)) {
      collectStoredMediaPaths(item, into);
    }
  }
}

function replaceStrings(value: unknown, signed: Map<string, string>): unknown {
  if (typeof value === "string") {
    return signed.get(value) ?? value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStrings(item, signed));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        field,
        replaceStrings(item, signed),
      ]),
    );
  }
  return value;
}

/** Swaps every stored media path in a procedure output for its presigned bucket URL. */
export async function signMediaUrls<T>(value: T, now = Date.now()): Promise<T> {
  const stored = new Set<string>();
  collectStoredMediaPaths(value, stored);
  if (stored.size === 0) {
    return value;
  }
  const signed = new Map(
    await Promise.all(
      [...stored].map(
        async (path) => [path, await signMediaUrl(path, now)] as const,
      ),
    ),
  );
  return replaceStrings(value, signed) as T;
}
