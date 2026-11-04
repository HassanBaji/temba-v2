import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export const ENTITY_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const ENTITY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export type EntityImageContentType = "image/jpeg" | "image/png" | "image/webp";

/** The word the field's errors start with: a Group image or a Venue logo. */
export type EntityImageNoun = "Image" | "Logo";

export function asEntityImageContentType(
  value: string,
): EntityImageContentType | null {
  if (value === "image/jpg") {
    return "image/jpeg";
  }
  if (
    value === "image/jpeg" ||
    value === "image/png" ||
    value === "image/webp"
  ) {
    return value;
  }
  return null;
}

export type PickedImage = { type: string; size: number };

function typeError(noun: EntityImageNoun, locale: Locale) {
  const m = messagesFor(locale).createGame.image;
  return noun === "Logo" ? m.logoType : m.imageType;
}

function sizeError(noun: EntityImageNoun, locale: Locale) {
  const m = messagesFor(locale).createGame.image;
  return noun === "Logo" ? m.logoTooLarge : m.imageTooLarge;
}

export function entityImageFileError(
  file: PickedImage,
  locale: Locale,
  noun: EntityImageNoun = "Image",
): string | null {
  if (!asEntityImageContentType(file.type)) {
    return typeError(noun, locale);
  }
  if (file.size > ENTITY_IMAGE_MAX_BYTES) {
    return sizeError(noun, locale);
  }
  return null;
}

export async function entityImageUploadInput(
  file: File,
  locale: Locale,
  noun: EntityImageNoun = "Image",
): Promise<{
  contentType: EntityImageContentType;
  dataBase64: string;
}> {
  const error = entityImageFileError(file, locale, noun);
  if (error) {
    throw new Error(error);
  }
  const contentType = asEntityImageContentType(file.type);
  if (!contentType) {
    throw new Error(typeError(noun, locale));
  }
  return { contentType, dataBase64: await fileToBase64(file) };
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
