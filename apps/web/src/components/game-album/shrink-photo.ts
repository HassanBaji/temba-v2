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

export function fitWithin(width: number, height: number, maxEdge: number) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
}

async function shrunkJpeg(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file);
  const size = fitWithin(bitmap.width, bitmap.height, PHOTO_MAX_EDGE);
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    return null;
  }
  context.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  for (const quality of JPEG_QUALITIES) {
    const blob = await canvasBlob(canvas, quality);
    if (blob && blob.size <= ENTITY_IMAGE_MAX_BYTES) {
      return blob;
    }
  }
  return null;
}

/** A photo over the API's 2 MB cap is redrawn as a JPEG in the browser before upload. */
export async function photoUploadInput(
  file: File,
  locale: Locale,
): Promise<{ contentType: EntityImageContentType; dataBase64: string }> {
  const errors = messagesFor(locale).gameAlbum.errors;
  const contentType = asEntityImageContentType(file.type);
  if (!contentType) {
    throw new Error(errors.photoType);
  }
  if (file.size <= ENTITY_IMAGE_MAX_BYTES) {
    return { contentType, dataBase64: await fileToBase64(file) };
  }
  const shrunk = await shrunkJpeg(file);
  if (!shrunk) {
    throw new Error(errors.photoTooLarge);
  }
  return {
    contentType: "image/jpeg",
    dataBase64: await fileToBase64(
      new File([shrunk], file.name, { type: "image/jpeg" }),
    ),
  };
}
