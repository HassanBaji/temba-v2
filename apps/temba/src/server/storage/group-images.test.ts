import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";

import {
  assertGroupImageType,
  decodeGroupImageBase64,
  detectGroupImageContentType,
  GROUP_IMAGE_MAX_BYTES,
} from "~/server/storage/group-images";

const JPEG_BYTES = Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
]);
const PNG_BYTES = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
]);
const WEBP_BYTES = Uint8Array.from([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

describe("detectGroupImageContentType", () => {
  it("detects JPEG, PNG, and WebP magic bytes", () => {
    expect(detectGroupImageContentType(JPEG_BYTES)).toBe("image/jpeg");
    expect(detectGroupImageContentType(PNG_BYTES)).toBe("image/png");
    expect(detectGroupImageContentType(WEBP_BYTES)).toBe("image/webp");
  });

  it("returns null for other bytes", () => {
    expect(
      detectGroupImageContentType(new Uint8Array([0x47, 0x49, 0x46])),
    ).toBe(null);
    expect(detectGroupImageContentType(new Uint8Array())).toBe(null);
  });
});

describe("decodeGroupImageBase64", () => {
  it("rejects an empty file", () => {
    expect(() => decodeGroupImageBase64("")).toThrow(TRPCError);
    try {
      decodeGroupImageBase64("");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      if (error instanceof TRPCError) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toBe("Image file is empty");
      }
    }
  });

  it("rejects a file over 2 MB", () => {
    const oversized = Buffer.alloc(GROUP_IMAGE_MAX_BYTES + 1, 0xff);
    oversized.set(JPEG_BYTES.subarray(0, 3), 0);
    expect(() => decodeGroupImageBase64(oversized.toString("base64"))).toThrow(
      TRPCError,
    );
    try {
      decodeGroupImageBase64(oversized.toString("base64"));
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      if (error instanceof TRPCError) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toBe("Image must be at most 2 MB");
      }
    }
  });

  it("returns the decoded bytes when they fit", () => {
    const decoded = decodeGroupImageBase64(toBase64(JPEG_BYTES));
    expect(decoded.equals(Buffer.from(JPEG_BYTES))).toBe(true);
  });
});

describe("assertGroupImageType", () => {
  it("accepts a declared type that matches the magic bytes", () => {
    expect(assertGroupImageType(JPEG_BYTES, "image/jpeg")).toBe("image/jpeg");
    expect(assertGroupImageType(PNG_BYTES, "image/png")).toBe("image/png");
    expect(assertGroupImageType(WEBP_BYTES, "image/webp")).toBe("image/webp");
  });

  it("rejects a declared type that does not match", () => {
    expect(() => assertGroupImageType(JPEG_BYTES, "image/png")).toThrow(
      TRPCError,
    );
    try {
      assertGroupImageType(JPEG_BYTES, "image/png");
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      if (error instanceof TRPCError) {
        expect(error.code).toBe("BAD_REQUEST");
        expect(error.message).toBe("Image must be a JPEG, PNG, or WebP image");
      }
    }
  });
});
