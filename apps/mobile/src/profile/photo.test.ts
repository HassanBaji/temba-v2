import assert from "node:assert/strict";
import { describe, it } from "vitest";

import { imageDataUri, photoErrorMessage } from "./photo";

describe("imageDataUri", () => {
  it("prefixes the base64 body with its mime type", () => {
    assert.equal(
      imageDataUri("QUJD", "image/png"),
      "data:image/png;base64,QUJD",
    );
  });

  it("falls back to JPEG, which the picker returns when it re-encodes", () => {
    assert.equal(imageDataUri("QUJD", null), "data:image/jpeg;base64,QUJD");
  });
});

describe("photoErrorMessage", () => {
  it("uses Clerk's message when the SDK refuses the upload", () => {
    const error = {
      errors: [
        {
          code: "form_param_format_invalid",
          message: "invalid",
          longMessage: "Image is too large.",
        },
      ],
    };
    assert.ok(photoErrorMessage(error).length > 0);
  });

  it("falls back to a generic message for anything else", () => {
    assert.ok(photoErrorMessage(new Error("network")).length > 0);
  });
});
