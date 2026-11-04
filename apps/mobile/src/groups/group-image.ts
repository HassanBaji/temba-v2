import {
  asEntityImageContentType,
  entityImageFileError,
  type EntityImageContentType,
} from "@repo/domain/entity-image-file";
import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function groupImageUnreadable(locale: Locale) {
  return messagesFor(locale).mobileGroup.imageUnreadable;
}

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

export function pickedImage(asset: PickedAsset, locale: Locale): PickedImage {
  if (!asset.base64) {
    return { ok: false, error: groupImageUnreadable(locale) };
  }
  const error = entityImageFileError(
    {
      type: asset.mimeType ?? "",
      size: base64ByteLength(asset.base64),
    },
    locale,
  );
  const contentType = asEntityImageContentType(asset.mimeType ?? "");
  if (error || !contentType) {
    return { ok: false, error: error ?? groupImageUnreadable(locale) };
  }
  return { ok: true, contentType, dataBase64: asset.base64 };
}
