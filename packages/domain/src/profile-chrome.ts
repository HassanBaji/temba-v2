import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function profileSettingsAriaLabel(
  pendingInviteCount: number,
  locale: Locale,
) {
  const m = messagesFor(locale);
  return pendingInviteCount > 0
    ? m.profile.chrome.settingsPending(pendingInviteCount)
    : m.common.settings;
}
