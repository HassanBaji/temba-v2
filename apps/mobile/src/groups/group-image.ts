import {
  asEntityImageContentType,
  entityImageFileError,
  type EntityImageContentType,
} from "@repo/domain/entity-image-file";

export const GROUP_IMAGE_UNREADABLE =
  "That image could not be read. Try another one.";

export type PickedAsset = {
  mimeType?: string | null;
  base64?: string | null;
};

export type PickedImage =
  | { ok: true; contentType: EntityImageContentType; dataBase64: string }
  | { ok: false; error: string };

export function base64ByteLength(base64: string) {
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

export function pickedImage(asset: PickedAsset): PickedImage {
  if (!asset.base64) {
    return { ok: false, error: GROUP_IMAGE_UNREADABLE };
  }
  const error = entityImageFileError({
    type: asset.mimeType ?? "",
    size: base64ByteLength(asset.base64),
  });
  const contentType = asEntityImageContentType(asset.mimeType ?? "");
  if (error || !contentType) {
    return { ok: false, error: error ?? GROUP_IMAGE_UNREADABLE };
  }
  return { ok: true, contentType, dataBase64: asset.base64 };
}
