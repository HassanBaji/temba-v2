import { describe, expect, it } from "vitest";

import {
  asGroupImageContentType,
  GROUP_IMAGE_MAX_BYTES,
  groupImageFileError,
} from "~/lib/group-image-file";

function fakeFile(args: { type: string; size: number }): File {
  const bytes = new Uint8Array(Math.min(args.size, 16));
  const file = new File([bytes], "pick.bin", { type: args.type });
  Object.defineProperty(file, "size", { value: args.size });
  return file;
}

describe("asGroupImageContentType", () => {
  it("accepts JPEG, PNG, and WebP", () => {
    expect(asGroupImageContentType("image/jpeg")).toBe("image/jpeg");
    expect(asGroupImageContentType("image/jpg")).toBe("image/jpeg");
    expect(asGroupImageContentType("image/png")).toBe("image/png");
    expect(asGroupImageContentType("image/webp")).toBe("image/webp");
  });

  it("rejects other types", () => {
    expect(asGroupImageContentType("image/gif")).toBeNull();
    expect(asGroupImageContentType("image/svg+xml")).toBeNull();
    expect(asGroupImageContentType("image/avif")).toBeNull();
  });
});

describe("groupImageFileError", () => {
  it("rejects non-JPEG/PNG/WebP before mutate", () => {
    expect(groupImageFileError(fakeFile({ type: "image/gif", size: 12 }))).toBe(
      "Image must be a JPEG, PNG, or WebP image",
    );
  });

  it("rejects a file over 2 MB before mutate", () => {
    expect(
      groupImageFileError(
        fakeFile({ type: "image/jpeg", size: GROUP_IMAGE_MAX_BYTES + 1 }),
      ),
    ).toBe("Image must be at most 2 MB");
  });

  it("accepts a JPEG within the cap", () => {
    expect(
      groupImageFileError(fakeFile({ type: "image/jpeg", size: 1024 })),
    ).toBeNull();
  });
});
