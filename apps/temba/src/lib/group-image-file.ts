export const GROUP_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

export const GROUP_IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

export const GROUP_CREATED_WITHOUT_IMAGE_TOAST =
  "Group created without an image";

export type GroupImageContentType = "image/jpeg" | "image/png" | "image/webp";

export function asGroupImageContentType(
  value: string,
): GroupImageContentType | null {
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

export function groupImageFileError(file: File): string | null {
  if (!asGroupImageContentType(file.type)) {
    return "Image must be a JPEG, PNG, or WebP image";
  }
  if (file.size > GROUP_IMAGE_MAX_BYTES) {
    return "Image must be at most 2 MB";
  }
  return null;
}

export async function groupImageUploadInput(file: File): Promise<{
  contentType: GroupImageContentType;
  dataBase64: string;
}> {
  const error = groupImageFileError(file);
  if (error) {
    throw new Error(error);
  }
  const contentType = asGroupImageContentType(file.type);
  if (!contentType) {
    throw new Error("Image must be a JPEG, PNG, or WebP image");
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
