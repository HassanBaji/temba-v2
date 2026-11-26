import { describe, expect, it } from "vitest";

import {
  clampCrop,
  cropImageBox,
  croppedEdge,
  cropSourceRect,
  INITIAL_CROP,
  panCrop,
  PHOTO_CROP_MAX_ZOOM,
  zoomCrop,
} from "~/lib/photo-crop";

const landscape = { width: 4000, height: 2000 };
const square = { width: 1000, height: 1000 };

describe("cropSourceRect", () => {
  it("takes the centred square of the short side at zoom 1", () => {
    expect(cropSourceRect(INITIAL_CROP, landscape)).toEqual({
      x: 1000,
      y: 0,
      size: 2000,
    });
  });

  it("takes a smaller square when zoomed in", () => {
    expect(cropSourceRect({ zoom: 2, x: 0, y: 0 }, square)).toEqual({
      x: 250,
      y: 250,
      size: 500,
    });
  });

  it("follows the photo when it is moved right", () => {
    const rect = cropSourceRect({ zoom: 1, x: 0.5, y: 0 }, landscape);
    expect(rect.x).toBe(0);
  });

  it("never reaches outside the photo", () => {
    const rect = cropSourceRect({ zoom: 1, x: -9, y: 9 }, landscape);
    expect(rect).toEqual({ x: 2000, y: 0, size: 2000 });
  });
});

describe("clampCrop", () => {
  it("keeps the zoom between 1 and the maximum", () => {
    expect(clampCrop({ zoom: 0.2, x: 0, y: 0 }, square).zoom).toBe(1);
    expect(clampCrop({ zoom: 99, x: 0, y: 0 }, square).zoom).toBe(
      PHOTO_CROP_MAX_ZOOM,
    );
    expect(clampCrop({ zoom: Number.NaN, x: 0, y: 0 }, square).zoom).toBe(1);
  });

  it("does not let a square photo move at zoom 1", () => {
    expect(clampCrop({ zoom: 1, x: 0.3, y: -0.3 }, square)).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });

  it("lets a wide photo move sideways only", () => {
    expect(clampCrop({ zoom: 1, x: 0.8, y: 0.8 }, landscape)).toEqual({
      zoom: 1,
      x: 0.5,
      y: 0,
    });
  });
});

describe("panCrop", () => {
  it("adds the drag to the position", () => {
    expect(
      panCrop({ zoom: 2, x: 0, y: 0 }, { x: 0.1, y: -0.2 }, square),
    ).toEqual({ zoom: 2, x: 0.1, y: -0.2 });
  });
});

describe("zoomCrop", () => {
  it("zooms about the centre by default", () => {
    expect(zoomCrop({ zoom: 2, x: 0.2, y: 0 }, 3, square)).toEqual({
      zoom: 3,
      x: expect.closeTo(0.3) as number,
      y: 0,
    });
  });

  it("keeps the point under the focus still", () => {
    const focus = { x: 0.25, y: 0.25 };
    const before = { zoom: 1, x: 0, y: 0 };
    const after = zoomCrop(before, 2, square, focus);
    const pointBefore = (focus.x - before.x) / before.zoom;
    const pointAfter = (focus.x - after.x) / after.zoom;
    expect(pointAfter).toBeCloseTo(pointBefore);
  });

  it("pulls the photo back over the frame when zooming out", () => {
    expect(zoomCrop({ zoom: 2, x: 0.5, y: 0.5 }, 1, square)).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
  });
});

describe("cropImageBox", () => {
  it("overhangs the frame equally on both sides of a centred wide photo", () => {
    expect(cropImageBox(INITIAL_CROP, landscape)).toEqual({
      left: -50,
      top: 0,
      width: 200,
      height: 100,
    });
  });
});

describe("croppedEdge", () => {
  it("caps a large crop at the saved size", () => {
    expect(croppedEdge(2000)).toBe(512);
  });

  it("does not upscale a small crop", () => {
    expect(croppedEdge(300.4)).toBe(300);
    expect(croppedEdge(0)).toBe(1);
  });
});
