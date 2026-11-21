import {
  croppedEdge,
  cropSourceRect,
  type PhotoCrop,
  type Size,
} from "~/lib/photo-crop";

const VECTOR_LONG_SIDE = 1024;
const RASTER_MAX_LONG_SIDE = 2048;
const JPEG_QUALITY = 0.86;

export type DecodedPhoto = { source: CanvasImageSource; natural: Size };

function isVector(file: { type: string; name: string }) {
  return file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
}

export function jpegFileName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base === "" ? "photo" : base}.jpg`;
}

/**
 * The canvas size a vector image is rasterised at before cropping. An SVG
 * often has no intrinsic size, so it is drawn at a fixed long side; a raster
 * image keeps its own size up to a cap.
 */
export function rasterSize(natural: Size, vector: boolean) {
  const width = natural.width > 0 ? natural.width : 1;
  const height = natural.height > 0 ? natural.height : 1;
  const longSide = Math.max(width, height);
  const target = vector
    ? VECTOR_LONG_SIDE
    : Math.min(longSide, RASTER_MAX_LONG_SIDE);
  const scale = target / longSide;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image could not be decoded"));
    image.src = url;
  });
}

function canvasOf(size: Size) {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  return canvas;
}

/**
 * Decodes a picked photo from its object URL. `null` means the browser cannot
 * read it (a HEIC outside Safari, a PDF renamed .jpg).
 */
export async function decodePhoto(
  url: string,
  file: { type: string; name: string },
): Promise<DecodedPhoto | null> {
  try {
    const image = await loadImage(url);
    const hasSize = image.naturalWidth > 0 && image.naturalHeight > 0;
    if (!isVector(file)) {
      return hasSize
        ? {
            source: image,
            natural: { width: image.naturalWidth, height: image.naturalHeight },
          }
        : null;
    }
    const natural = rasterSize(
      hasSize
        ? { width: image.naturalWidth, height: image.naturalHeight }
        : { width: VECTOR_LONG_SIDE, height: VECTOR_LONG_SIDE },
      true,
    );
    const canvas = canvasOf(natural);
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.drawImage(image, 0, 0, natural.width, natural.height);
    return { source: canvas, natural };
  } catch {
    return null;
  }
}

/**
 * Halves the crop until it is within twice the target before the last draw.
 * One large downscale aliases badly in Safari and Firefox.
 */
function downscale(
  photo: DecodedPhoto,
  rect: { x: number; y: number; size: number },
  edge: number,
): HTMLCanvasElement | null {
  let source: CanvasImageSource = photo.source;
  let sx = rect.x;
  let sy = rect.y;
  let side = rect.size;
  while (side > edge * 2) {
    const half = Math.round(side / 2);
    const step = canvasOf({ width: half, height: half });
    const context = step.getContext("2d");
    if (!context) {
      return null;
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(source, sx, sy, side, side, 0, 0, half, half);
    source = step;
    sx = 0;
    sy = 0;
    side = half;
  }
  const canvas = canvasOf({ width: edge, height: edge });
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }
  // JPEG has no transparency; a transparent PNG would otherwise turn black.
  context.fillStyle = "white";
  context.fillRect(0, 0, edge, edge);
  context.imageSmoothingQuality = "high";
  context.drawImage(source, sx, sy, side, side, 0, 0, edge, edge);
  return canvas;
}

/**
 * The file to send to Clerk: the square the User framed, redrawn as a JPEG at
 * most 512 px a side. Whatever was picked, the upload stays well under
 * Clerk's size limit. `null` means the browser could not draw it.
 */
export async function croppedPhotoFile(
  photo: DecodedPhoto,
  crop: PhotoCrop,
  name: string,
): Promise<File | null> {
  const rect = cropSourceRect(crop, photo.natural);
  const canvas = downscale(photo, rect, croppedEdge(rect.size));
  if (!canvas) {
    return null;
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  return blob
    ? new File([blob], jpegFileName(name), { type: "image/jpeg" })
    : null;
}
