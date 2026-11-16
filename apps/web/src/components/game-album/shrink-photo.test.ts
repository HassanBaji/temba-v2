import { describe, expect, it } from "vitest";

import { ENTITY_IMAGE_MAX_BYTES } from "@repo/domain/entity-image-file";

import { fitWithin, uploadableAsIs } from "./shrink-photo";

describe("uploadableAsIs", () => {
  it("passes JPEG, PNG and WebP under the cap straight through", () => {
    expect(uploadableAsIs({ type: "image/jpeg", size: 1000 })).toBe(
      "image/jpeg",
    );
    expect(uploadableAsIs({ type: "image/jpg", size: 1000 })).toBe(
      "image/jpeg",
    );
    expect(uploadableAsIs({ type: "image/png", size: 1000 })).toBe("image/png");
    expect(uploadableAsIs({ type: "image/webp", size: 1000 })).toBe(
      "image/webp",
    );
  });

  it("sends HEIC, AVIF, GIF and untyped files to be redrawn", () => {
    for (const type of [
      "image/heic",
      "image/heif",
      "image/avif",
      "image/gif",
      "",
    ]) {
      expect(uploadableAsIs({ type, size: 1000 })).toBeNull();
    }
  });

  it("sends a supported photo over the cap to be redrawn", () => {
    expect(
      uploadableAsIs({ type: "image/jpeg", size: ENTITY_IMAGE_MAX_BYTES + 1 }),
    ).toBeNull();
  });
});

describe("fitWithin", () => {
  it("scales the long edge down and keeps small photos as they are", () => {
    expect(fitWithin(4032, 3024, 2048)).toEqual({ width: 2048, height: 1536 });
    expect(fitWithin(800, 600, 2048)).toEqual({ width: 800, height: 600 });
  });
});
