import { ENTITY_IMAGE_MAX_BYTES } from "@repo/domain/entity-image-file";
import { describe, expect, it } from "vitest";

import {
  base64ByteLength,
  groupImageUnreadable,
  pickedImage,
} from "./group-image";

function base64OfSize(bytes: number) {
  return Buffer.alloc(bytes, 1).toString("base64");
}

describe("base64ByteLength", () => {
  it("counts the decoded bytes", () => {
    for (const size of [0, 1, 2, 3, 100, 1001]) {
      expect(base64ByteLength(base64OfSize(size))).toBe(size);
    }
  });
});

describe("pickedImage", () => {
  it("accepts a JPEG within the cap", () => {
    const dataBase64 = base64OfSize(1024);
    expect(
      pickedImage({ mimeType: "image/jpeg", base64: dataBase64 }, "en"),
    ).toEqual({ ok: true, contentType: "image/jpeg", dataBase64 });
  });

  it("accepts an image exactly at the cap", () => {
    expect(
      pickedImage(
        {
          mimeType: "image/png",
          base64: base64OfSize(ENTITY_IMAGE_MAX_BYTES),
        },
        "en",
      ).ok,
    ).toBe(true);
  });

  it("refuses an image over 2 MB with the web message", () => {
    expect(
      pickedImage(
        {
          mimeType: "image/jpeg",
          base64: base64OfSize(ENTITY_IMAGE_MAX_BYTES + 1),
        },
        "en",
      ),
    ).toEqual({ ok: false, error: "Image must be at most 2 MB" });
  });

  it("refuses the wrong type with the web message", () => {
    expect(
      pickedImage({ mimeType: "image/heic", base64: base64OfSize(10) }, "en"),
    ).toEqual({
      ok: false,
      error: "Image must be a JPEG, PNG, or WebP image",
    });
  });

  it("refuses an image with no bytes", () => {
    expect(pickedImage({ mimeType: "image/jpeg", base64: null }, "en")).toEqual(
      {
        ok: false,
        error: groupImageUnreadable("en"),
      },
    );
  });

  it("refuses an image with no bytes in Arabic", () => {
    const result = pickedImage({ mimeType: "image/jpeg", base64: null }, "ar");
    expect(result.ok).toBe(false);
    expect(groupImageUnreadable("ar")).toMatch(/[؀-ۿ]/);
  });
});
