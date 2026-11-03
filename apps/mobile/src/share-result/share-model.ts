import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export type ShareMode = "story" | "sticker";

export function shareModeHint(mode: ShareMode, locale: Locale) {
  return messagesFor(locale).mobilePlayer.share.hint[mode];
}
