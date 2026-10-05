import { describe, expect, it } from "vitest";

import {
  asEntityImageContentType,
  ENTITY_IMAGE_MAX_BYTES,
  entityImageFileError,
  entityImageUploadInput,
} from "./entity-image-file";

function fakeFile(args: { type: string; size: number }): File {
  const bytes = new Uint8Array(Math.min(args.size, 16));
  const file = new File([bytes], "pick.bin", { type: args.type });
  Object.defineProperty(file, "size", { value: args.size });
  return file;
}

describe("asEntityImageContentType", () => {
  it("accepts JPEG, PNG, and WebP", () => {
    expect(asEntityImageContentType("image/jpeg")).toBe("image/jpeg");
    expect(asEntityImageContentType("image/jpg")).toBe("image/jpeg");
    expect(asEntityImageContentType("image/png")).toBe("image/png");
    expect(asEntityImageContentType("image/webp")).toBe("image/webp");
  });

  it("rejects other types", () => {
    expect(asEntityImageContentType("image/gif")).toBeNull();
    expect(asEntityImageContentType("image/svg+xml")).toBeNull();
    expect(asEntityImageContentType("image/avif")).toBeNull();
  });
});

describe("entityImageFileError", () => {
  it("rejects non-JPEG/PNG/WebP before mutate", () => {
    expect(
      entityImageFileError(fakeFile({ type: "image/gif", size: 12 })),
    ).toBe("Image must be a JPEG, PNG, or WebP image");
  });

  it("rejects a file over 2 MB before mutate", () => {
    expect(
      entityImageFileError(
        fakeFile({ type: "image/jpeg", size: ENTITY_IMAGE_MAX_BYTES + 1 }),
      ),
    ).toBe("Image must be at most 2 MB");
  });

  it("checks a picked image that is not a File", () => {
    expect(entityImageFileError({ type: "image/heic", size: 1024 })).toBe(
      "Image must be a JPEG, PNG, or WebP image",
    );
    expect(
      entityImageFileError({ type: "image/png", size: ENTITY_IMAGE_MAX_BYTES }),
    ).toBeNull();
  });

  it("accepts a JPEG within the cap", () => {
    expect(
      entityImageFileError(fakeFile({ type: "image/jpeg", size: 1024 })),
    ).toBeNull();
  });

  it("names a Venue logo in its errors", () => {
    expect(
      entityImageFileError(fakeFile({ type: "image/gif", size: 12 }), "Logo"),
    ).toBe("Logo must be a JPEG, PNG, or WebP image");
    expect(
      entityImageFileError(
        fakeFile({ type: "image/png", size: ENTITY_IMAGE_MAX_BYTES + 1 }),
        "Logo",
      ),
    ).toBe("Logo must be at most 2 MB");
  });
});

describe("entityImageUploadInput", () => {
  it("normalises image/jpg and encodes the bytes", async () => {
    const file = new File([new Uint8Array([1, 2, 3])], "a.jpg", {
      type: "image/jpg",
    });

    await expect(entityImageUploadInput(file, "Logo")).resolves.toEqual({
      contentType: "image/jpeg",
      dataBase64: "AQID",
    });
  });

  it("refuses a file the check rejects", async () => {
    await expect(
      entityImageUploadInput(fakeFile({ type: "image/gif", size: 12 }), "Logo"),
    ).rejects.toThrow("Logo must be a JPEG, PNG, or WebP image");
  });
});
