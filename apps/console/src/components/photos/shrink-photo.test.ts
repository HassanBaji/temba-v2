import { describe, expect, it } from "vitest";

import { fitWithin, photoFileError } from "./shrink-photo";

describe("fitWithin", () => {
  it("scales the long edge down and keeps the ratio", () => {
    expect(fitWithin(4032, 3024, 2400)).toEqual({ width: 2400, height: 1800 });
    expect(fitWithin(3024, 4032, 2400)).toEqual({ width: 1800, height: 2400 });
  });

  it("never scales up", () => {
    expect(fitWithin(1200, 800, 2400)).toEqual({ width: 1200, height: 800 });
  });
});

describe("photoFileError", () => {
  it("accepts a large JPEG, PNG or WebP", () => {
    expect(photoFileError({ type: "image/jpeg", size: 9_000_000 })).toBeNull();
    expect(photoFileError({ type: "image/webp", size: 10 })).toBeNull();
  });

  it("refuses other types and very large files", () => {
    expect(photoFileError({ type: "image/heic", size: 10 })).toBe(
      "Photo must be a JPEG, PNG, or WebP image",
    );
    expect(photoFileError({ type: "image/png", size: 26 * 1024 * 1024 })).toBe(
      "Photo must be at most 25 MB",
    );
  });
});
