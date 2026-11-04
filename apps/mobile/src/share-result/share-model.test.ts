import { describe, expect, it } from "vitest";

import { shareModeCopy } from "./share-model";

describe("shareModeCopy", () => {
  it("describes the story as a full-size image", () => {
    expect(shareModeCopy("story", "en")).toEqual({
      format: "1080 × 1920 · STORY",
      share: "Share image",
      save: "Save",
      note: null,
    });
  });

  it("says only the card is saved for a sticker", () => {
    expect(shareModeCopy("sticker", "en")).toEqual({
      format: "TRANSPARENT PNG · STICKER",
      share: "Share sticker",
      save: "Save PNG",
      note: "Only the black card is saved. Drop it on your own photo in the story editor.",
    });
  });

  it("reads the sticker copy in Arabic", () => {
    expect(shareModeCopy("sticker", "ar").share).toBe("مشاركة الملصق");
  });
});
