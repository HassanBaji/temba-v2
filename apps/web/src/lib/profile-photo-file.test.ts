import { describe, expect, it } from "vitest";

import { jpegFileName, rasterSize } from "~/lib/profile-photo-file";

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

describe("rasterSize", () => {
  it("draws a vector at a fixed long side, keeping its shape", () => {
    expect(rasterSize({ width: 100, height: 50 }, true)).toEqual({
      width: 1024,
      height: 512,
    });
  });

  it("keeps a small raster image at its own size", () => {
    expect(rasterSize({ width: 300, height: 400 }, false)).toEqual({
      width: 300,
      height: 400,
    });
  });

  it("caps a large raster image", () => {
    expect(rasterSize({ width: 4000, height: 3000 }, false)).toEqual({
      width: 2048,
      height: 1536,
    });
  });

  it("never returns an empty canvas", () => {
    expect(rasterSize({ width: 0, height: 0 }, true)).toEqual({
      width: 1024,
      height: 1024,
    });
  });
});
