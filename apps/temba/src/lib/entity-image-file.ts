export const ENTITY_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const ENTITY_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const ENTITY_IMAGE_HELP = "Optional. JPEG, PNG, or WebP, at most 2 MB.";

export const GROUP_CREATED_WITHOUT_IMAGE_TOAST =
  "Group created without an image";

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

export function entityImageFileError(
  file: File,
  noun: EntityImageNoun = "Image",
): string | null {
  if (!asEntityImageContentType(file.type)) {
    return `${noun} must be a JPEG, PNG, or WebP image`;
  }
  if (file.size > ENTITY_IMAGE_MAX_BYTES) {
    return `${noun} must be at most 2 MB`;
  }
  return null;
}

export async function entityImageUploadInput(
  file: File,
  noun: EntityImageNoun = "Image",
): Promise<{
  contentType: EntityImageContentType;
  dataBase64: string;
}> {
  const error = entityImageFileError(file, noun);
  if (error) {
    throw new Error(error);
  }
  const contentType = asEntityImageContentType(file.type);
  if (!contentType) {
    throw new Error(`${noun} must be a JPEG, PNG, or WebP image`);
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
