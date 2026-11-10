import {
  asEntityImageContentType,
  ENTITY_IMAGE_MAX_BYTES,
  fileToBase64,
  type EntityImageContentType,
} from "@repo/domain/entity-image-file";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

/** Long edge after shrinking: sharp on a retina console and a phone, small enough to stay under 2 MB. */
export const PHOTO_MAX_EDGE = 2400;

export const PHOTO_SOURCE_MAX_BYTES = 25 * 1024 * 1024;

const JPEG_QUALITIES = [0.86, 0.76, 0.64, 0.5];

export function fitWithin(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function photoFileError(
  file: { type: string; size: number },
  locale: Locale,
) {
  const m = messagesFor(locale).consoleVenue.photos;
  if (!asEntityImageContentType(file.type)) {
    return m.wrongType;
  }
  if (file.size > PHOTO_SOURCE_MAX_BYTES) {
    return m.tooLarge;
  }
  return null;
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

async function shrunkJpeg(file: File, locale: Locale): Promise<Blob> {
  const m = messagesFor(locale).consoleVenue.photos;
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error(m.notResized);
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasBlob(canvas, quality);
    if (blob && blob.size <= ENTITY_IMAGE_MAX_BYTES) {
      return blob;
    }
  }
  throw new Error(m.tooDetailed);
}

/** A photo over the API's 2 MB cap is redrawn as a JPEG in the browser before upload. */
export async function photoUploadInput(
  file: File,
  locale: Locale,
): Promise<{
  contentType: EntityImageContentType;
  dataBase64: string;
}> {
  const error = photoFileError(file, locale);
  const contentType = asEntityImageContentType(file.type);
  if (error || !contentType) {
    throw new Error(error ?? messagesFor(locale).consoleVenue.photos.wrongType);
  }
  if (file.size <= ENTITY_IMAGE_MAX_BYTES) {
    return { contentType, dataBase64: await fileToBase64(file) };
  }
  const shrunk = new File([await shrunkJpeg(file, locale)], file.name, {
    type: "image/jpeg",
  });
  return { contentType: "image/jpeg", dataBase64: await fileToBase64(shrunk) };
}
