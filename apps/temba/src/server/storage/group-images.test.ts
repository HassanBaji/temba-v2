import { TRPCError } from "@trpc/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { putS3Object, getS3Object, deleteS3Object } = vi.hoisted(() => ({
  putS3Object: vi.fn(),
  getS3Object: vi.fn(),
  deleteS3Object: vi.fn(),
}));

vi.mock("~/server/storage/s3", () => ({
  putS3Object,
  getS3Object,
  deleteS3Object,
}));

import {
  assertGroupImageType,
  decodeGroupImageBase64,
  detectGroupImageContentType,
  getGroupImageObject,
  GROUP_IMAGE_MAX_BYTES,
  removeGroupImageObject,
  uploadGroupImageObject,
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

const GROUP_ID = "22222222-2222-4222-8222-222222222222";

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

describe("uploadGroupImageObject", () => {
  beforeEach(() => {
    putS3Object.mockReset();
    putS3Object.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the object at group-images/{groupId}/image and returns an App media URL", async () => {
    const bytes = Buffer.from(PNG_BYTES);
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);

    const url = await uploadGroupImageObject({
      groupId: GROUP_ID,
      bytes,
      contentType: "image/png",
    });

    expect(putS3Object).toHaveBeenCalledWith({
      key: `group-images/${GROUP_ID}/image`,
      body: bytes,
      contentType: "image/png",
    });
    expect(url).toBe(
      `/api/media/group-images/${GROUP_ID}/image?v=1700000000000`,
    );
  });

  it("changes v on a later upsert of the same key", async () => {
    const bytes = Buffer.from(JPEG_BYTES);
    vi.spyOn(Date, "now")
      .mockReturnValueOnce(1_700_000_000_000)
      .mockReturnValueOnce(1_700_000_000_500);

    const first = await uploadGroupImageObject({
      groupId: GROUP_ID,
      bytes,
      contentType: "image/jpeg",
    });
    const second = await uploadGroupImageObject({
      groupId: GROUP_ID,
      bytes,
      contentType: "image/jpeg",
    });

    expect(putS3Object).toHaveBeenCalledTimes(2);
    expect(putS3Object.mock.calls[0]?.[0]?.key).toBe(
      `group-images/${GROUP_ID}/image`,
    );
    expect(putS3Object.mock.calls[1]?.[0]?.key).toBe(
      `group-images/${GROUP_ID}/image`,
    );
    expect(first).toBe(
      `/api/media/group-images/${GROUP_ID}/image?v=1700000000000`,
    );
    expect(second).toBe(
      `/api/media/group-images/${GROUP_ID}/image?v=1700000000500`,
    );
  });

  it("does not expose storage errors when Put fails", async () => {
    putS3Object.mockRejectedValue(new Error("AccessDenied: secret-key"));

    try {
      await uploadGroupImageObject({
        groupId: GROUP_ID,
        bytes: Buffer.from(PNG_BYTES),
        contentType: "image/png",
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      if (error instanceof TRPCError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(error.message).toBe("Failed to upload Group image");
        expect(error.message).not.toMatch(/AccessDenied|secret-key/i);
      }
    }
  });
});

describe("removeGroupImageObject", () => {
  beforeEach(() => {
    deleteS3Object.mockReset();
    deleteS3Object.mockResolvedValue(undefined);
  });

  it("deletes group-images/{groupId}/image", async () => {
    await removeGroupImageObject(GROUP_ID);
    expect(deleteS3Object).toHaveBeenCalledWith(
      `group-images/${GROUP_ID}/image`,
    );
  });

  it("does not expose storage errors when Delete fails", async () => {
    deleteS3Object.mockRejectedValue(new Error("NoSuchBucket credentials"));

    try {
      await removeGroupImageObject(GROUP_ID);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(TRPCError);
      if (error instanceof TRPCError) {
        expect(error.code).toBe("INTERNAL_SERVER_ERROR");
        expect(error.message).toBe("Failed to clear Group image");
        expect(error.message).not.toMatch(/NoSuchBucket|credentials/i);
      }
    }
  });
});

describe("getGroupImageObject", () => {
  beforeEach(() => {
    getS3Object.mockReset();
  });

  it("returns bytes and content type for a stored image", async () => {
    getS3Object.mockResolvedValue({
      body: PNG_BYTES,
      contentType: "image/png",
    });

    await expect(getGroupImageObject(GROUP_ID)).resolves.toEqual({
      bytes: PNG_BYTES,
      contentType: "image/png",
    });
    expect(getS3Object).toHaveBeenCalledWith(`group-images/${GROUP_ID}/image`);
  });

  it("returns null when the object is missing", async () => {
    getS3Object.mockResolvedValue(null);
    await expect(getGroupImageObject(GROUP_ID)).resolves.toBe(null);
  });
});
