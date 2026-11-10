import { describe, expect, it } from "vitest";

import {
  isProfilePhotoType,
  pngFileName,
  rasterSize,
} from "~/lib/profile-photo-file";

describe("isProfilePhotoType", () => {
  it("accepts the types Clerk takes", () => {
    for (const type of [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
    ]) {
      expect(isProfilePhotoType(type)).toBe(true);
    }
  });

  it("rejects SVG and other types", () => {
    for (const type of ["image/svg+xml", "text/xml", "image/bmp", ""]) {
      expect(isProfilePhotoType(type)).toBe(false);
    }
  });
});

describe("pngFileName", () => {
  it("swaps the extension for .png", () => {
    expect(pngFileName("SOOR-The Cap.svg")).toBe("SOOR-The Cap.png");
    expect(pngFileName("me.photo.bmp")).toBe("me.photo.png");
  });

  it("adds .png when there is no extension", () => {
    expect(pngFileName("avatar")).toBe("avatar.png");
    expect(pngFileName(".svg")).toBe("photo.png");
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
