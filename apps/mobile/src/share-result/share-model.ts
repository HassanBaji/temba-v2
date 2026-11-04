import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type ShareMode = "story" | "sticker";

export type ShareModeCopy = {
  /** The mono line under the preview: what the file is. */
  format: string;
  share: string;
  save: string;
  /** Shown under the preview when the saved file differs from what is on screen. */
  note: string | null;
};

export function shareModeCopy(mode: ShareMode, locale: Locale): ShareModeCopy {
  const m = messagesFor(locale);
  const share = m.mobilePlayer.share;
  if (mode === "story") {
    return {
      format: share.storyFormat,
      share: share.shareImage,
      save: m.common.save,
      note: null,
    };
  }
  return {
    format: share.stickerFormat,
    share: share.shareSticker,
    save: share.savePng,
    note: share.stickerNote,
  };
}
