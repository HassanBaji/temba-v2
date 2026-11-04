import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function memberCountLabel(count: number, locale: Locale) {
  return messagesFor(locale).group.memberCount(count);
}
