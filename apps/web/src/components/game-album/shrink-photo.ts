import {
  asEntityImageContentType,
  ENTITY_IMAGE_MAX_BYTES,
  fileToBase64,
  type EntityImageContentType,
} from "@repo/domain/entity-image-file";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** Long edge after shrinking: sharp on a phone and a laptop, small enough to stay under 2 MB. */
const PHOTO_MAX_EDGE = 2048;

const JPEG_QUALITIES = [0.84, 0.72, 0.6, 0.48];

/**
 * Any photo the browser can show is welcome; the extensions cover pickers
 * that give HEIC files no MIME type.
 */
export const ALBUM_PHOTO_ACCEPT = "image/*,.heic,.heif";

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

/** The API stores JPEG, PNG and WebP under 2 MB; anything else is redrawn first. */
export function uploadableAsIs(file: {
  type: string;
  size: number;
}): EntityImageContentType | null {
  const contentType = asEntityImageContentType(file.type);
  return contentType && file.size <= ENTITY_IMAGE_MAX_BYTES
    ? contentType
    : null;
}

type DecodedPhoto = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

async function decodeWithImageElement(file: File): Promise<DecodedPhoto> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    release: () => URL.revokeObjectURL(url),
  };
}

/** Safari decodes HEIC in `<img>` on versions where `createImageBitmap` refuses it. */
async function decodePhoto(file: File): Promise<DecodedPhoto | null> {
  try {
    const bitmap = await createImageBitmap(file);
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    };
  } catch {
    return decodeWithImageElement(file).catch(() => null);
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

async function redrawnJpeg(photo: DecodedPhoto, locale: Locale): Promise<Blob> {
  const copy = messagesFor(locale).gameAlbum;
  const size = fitWithin(photo.width, photo.height, PHOTO_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(copy.add.unreadable);
  }
  context.drawImage(photo.source, 0, 0, size.width, size.height);
  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasBlob(canvas, quality);
    if (blob && blob.size <= ENTITY_IMAGE_MAX_BYTES) {
      return blob;
    }
  }
  throw new Error(copy.errors.photoTooLarge);
}

/**
 * JPEG, PNG and WebP under the API's 2 MB cap go up as they are. Any other
 * format the browser can decode (HEIC from an iPhone, AVIF, GIF …), and any
 * photo over the cap, is redrawn as a JPEG first.
 */
export async function photoUploadInput(
  file: File,
  locale: Locale,
): Promise<{ contentType: EntityImageContentType; dataBase64: string }> {
  const asIs = uploadableAsIs(file);
  if (asIs) {
    return { contentType: asIs, dataBase64: await fileToBase64(file) };
  }
  const photo = await decodePhoto(file);
  if (!photo) {
    throw new Error(messagesFor(locale).gameAlbum.add.unreadable);
  }
  try {
    const jpeg = await redrawnJpeg(photo, locale);
    return {
      contentType: "image/jpeg",
      dataBase64: await fileToBase64(
        new File([jpeg], file.name, { type: "image/jpeg" }),
      ),
    };
  } finally {
    photo.release();
  }
}
