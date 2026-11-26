/**
 * Square crop geometry for a profile photo, in units of the crop frame's
 * side: the frame is 1 × 1 and centred on the origin. At zoom 1 the photo's
 * short side exactly fills the frame. `x` and `y` place the photo's centre
 * relative to the frame's centre, so the same crop renders identically at
 * any on-screen size.
 */
export type PhotoCrop = { zoom: number; x: number; y: number };

export type Size = { width: number; height: number };

export const PHOTO_CROP_MAX_ZOOM = 4;

/**
 * The saved photo's side in pixels. The largest place a profile photo is
 * drawn is the 160 px circle on the photo screen; 512 covers it on a 3x
 * display.
 */
export const PROFILE_PHOTO_EDGE = 512;

export const INITIAL_CROP: PhotoCrop = { zoom: 1, x: 0, y: 0 };

function shortSide(natural: Size) {
  return Math.max(1, Math.min(natural.width, natural.height));
}

/** The photo's drawn size, in frame units, at a zoom. */
export function displayedSize(natural: Size, zoom: number): Size {
  const unit = shortSide(natural);
  return {
    width: (zoom * Math.max(1, natural.width)) / unit,
    height: (zoom * Math.max(1, natural.height)) / unit,
  };
}

export function clampZoom(zoom: number) {
  if (!Number.isFinite(zoom)) {
    return 1;
  }
  return Math.min(PHOTO_CROP_MAX_ZOOM, Math.max(1, zoom));
}

function clampAxis(value: number, extent: number) {
  const limit = Math.max(0, (extent - 1) / 2);
  if (limit === 0) {
    return 0;
  }
  return Math.min(limit, Math.max(-limit, value));
}

/** Keeps the zoom in range and the frame covered by the photo. */
export function clampCrop(crop: PhotoCrop, natural: Size): PhotoCrop {
  const zoom = clampZoom(crop.zoom);
  const shown = displayedSize(natural, zoom);
  return {
    zoom,
    x: clampAxis(crop.x, shown.width),
    y: clampAxis(crop.y, shown.height),
  };
}

export function panCrop(
  crop: PhotoCrop,
  delta: { x: number; y: number },
  natural: Size,
): PhotoCrop {
  return clampCrop(
    { zoom: crop.zoom, x: crop.x + delta.x, y: crop.y + delta.y },
    natural,
  );
}

/**
 * Zooms while the point of the photo under `focus` (frame units from the
 * frame's centre) stays where it is, as a pinch or a scroll does.
 */
export function zoomCrop(
  crop: PhotoCrop,
  zoom: number,
  natural: Size,
  focus: { x: number; y: number } = { x: 0, y: 0 },
): PhotoCrop {
  const next = clampZoom(zoom);
  const ratio = next / crop.zoom;
  return clampCrop(
    {
      zoom: next,
      x: focus.x - (focus.x - crop.x) * ratio,
      y: focus.y - (focus.y - crop.y) * ratio,
    },
    natural,
  );
}

/** Where the photo sits in the frame, as percentages of the frame's side. */
export function cropImageBox(crop: PhotoCrop, natural: Size) {
  const shown = displayedSize(natural, crop.zoom);
  return {
    left: (0.5 + crop.x - shown.width / 2) * 100,
    top: (0.5 + crop.y - shown.height / 2) * 100,
    width: shown.width * 100,
    height: shown.height * 100,
  };
}

/** The square of the source photo, in its own pixels, that the frame shows. */
export function cropSourceRect(crop: PhotoCrop, natural: Size) {
  const { zoom, x, y } = clampCrop(crop, natural);
  const shown = displayedSize(natural, zoom);
  const pixelsPerUnit = shortSide(natural) / zoom;
  return {
    x: (shown.width / 2 - x - 0.5) * pixelsPerUnit,
    y: (shown.height / 2 - y - 0.5) * pixelsPerUnit,
    size: pixelsPerUnit,
  };
}

/** The saved photo's side: the crop's own size, never upscaled, capped. */
export function croppedEdge(sourceSize: number) {
  return Math.max(1, Math.min(PROFILE_PHOTO_EDGE, Math.round(sourceSize)));
}
