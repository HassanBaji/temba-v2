import { describe, expect, it } from "vitest";

import { jpegFileName, vectorRasterSize } from "~/lib/profile-photo-file";

describe("jpegFileName", () => {
  it("swaps the extension for .jpg", () => {
    expect(jpegFileName("SOOR-The Cap.svg")).toBe("SOOR-The Cap.jpg");
    expect(jpegFileName("me.photo.png")).toBe("me.photo.jpg");
  });

  it("adds .jpg when there is no extension", () => {
    expect(jpegFileName("avatar")).toBe("avatar.jpg");
    expect(jpegFileName(".svg")).toBe("photo.jpg");
  });
});

describe("vectorRasterSize", () => {
  it("draws a vector at a fixed long side, keeping its shape", () => {
    expect(vectorRasterSize({ width: 100, height: 50 })).toEqual({
      width: 1024,
      height: 512,
    });
    expect(vectorRasterSize({ width: 3000, height: 6000 })).toEqual({
      width: 512,
      height: 1024,
    });
  });

  it("never returns an empty canvas", () => {
    expect(vectorRasterSize({ width: 0, height: 0 })).toEqual({
      width: 1024,
      height: 1024,
    });
  });
});
