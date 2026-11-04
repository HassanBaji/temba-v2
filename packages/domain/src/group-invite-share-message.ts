import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { sportLabel as sportDisplayLabel } from "./sport";

export function groupInviteDisplayName(
  groupName: string | null | undefined,
  locale: Locale,
) {
  const trimmed = groupName?.trim();
  if (!trimmed) {
    return messagesFor(locale).invite.groupShare.fallbackName;
  }
  return trimmed;
}

export function groupInviteInvitationLine(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).invite.groupShare;
  const name = groupInviteDisplayName(input.groupName, input.locale);
  const sportLabel = sportDisplayLabel(input.sport, input.locale);
  return sportLabel
    ? m.invitationLineSport(name, sportLabel)
    : m.invitationLine(name);
}

export function groupInviteClipboardText(input: {
  groupName: string | null | undefined;
  sport: string | null | undefined;
  inviteUrl: string;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).invite.groupShare;
  return `${groupInviteInvitationLine(input)}\n${m.joinLine(input.inviteUrl)}`;
}
