import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { teamInviteLabel } from "./teams";

export type InviteDoorKind = "game" | "group" | "team";
export type InviteMode = "players" | "phone" | "link";

export function inviteModeLabel(mode: InviteMode, locale: Locale) {
  return messagesFor(locale).invite.door.mode[mode];
}

/** A text carries the invite link, so the Phone way in needs link rights. */
export function inviteModes(door: {
  canLookup: boolean;
  canLink: boolean;
}): InviteMode[] {
  const modes: InviteMode[] = [];
  if (door.canLookup) {
    modes.push("players");
  }
  if (door.canLink) {
    modes.push("phone", "link");
  }
  return modes;
}

export function inviteSheetTitle(
  kind: InviteDoorKind,
  locale: Locale,
  teamSquad = false,
) {
  return kind === "team"
    ? teamInviteLabel(teamSquad, locale)
    : messagesFor(locale).invite.door.invitePlayers;
}

export type LookupResultRow = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  cue?: string | null;
};

export type LookupResultView = {
  id: string;
  name: string;
  meta: string | null;
  accessibilityLabel: string;
};

/** "@nora_newman, Group member". */
export function lookupResultView(
  row: LookupResultRow,
  invited: boolean,
  locale: Locale,
): LookupResultView {
  const m = messagesFor(locale);
  const meta =
    [
      row.username ? m.common.isolate(`@${row.username}`) : null,
      row.cue ??
        row.email ??
        (row.phoneNumber ? m.common.isolate(row.phoneNumber) : null),
    ]
      .filter(Boolean)
      .join(m.group.metaSeparator) || null;
  return {
    id: row.id,
    name: row.name,
    meta,
    accessibilityLabel: [
      row.name,
      meta,
      invited ? m.invite.door.invitedA11y : null,
    ]
      .filter(Boolean)
      .join(m.group.metaSeparator),
  };
}

export function openSeatCount(
  sides: {
    left: { name: string } | null;
    right: { name: string } | null;
  }[],
) {
  return sides.reduce(
    (count, side) => count + (side.left ? 0 : 1) + (side.right ? 0 : 1),
    0,
  );
}

export function playersHeading(query: string, locale: Locale) {
  const m = messagesFor(locale).invite.door;
  return query.trim() ? m.resultsHeading : m.suggestedHeading;
}

export function noPlayersMatchCopy(
  query: string,
  canLink: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale).invite.door;
  return canLink
    ? m.noMatchTryOtherWays(query.trim())
    : m.noMatch(query.trim());
}

export function inviteButtonLabel(invited: boolean, locale: Locale) {
  const m = messagesFor(locale).invite.door;
  return invited ? m.invitedButton : m.inviteButton;
}

export function phoneInviteLabel(
  ready: boolean,
  sending: boolean,
  locale: Locale,
) {
  const m = messagesFor(locale).invite.door.phone;
  if (sending) {
    return m.sending;
  }
  return ready ? m.send : m.enterNumber;
}

export function phoneInviteNote(canLookup: boolean, locale: Locale) {
  const m = messagesFor(locale).invite.door.phone;
  return canLookup ? m.noteWithLookup : m.note;
}

/** The Temba User whose number is exactly this one, not just containing it. */
export function rowWithPhone(
  rows: readonly LookupResultRow[],
  e164: string,
): LookupResultRow | null {
  const digits = e164.replace(/\D/g, "");
  return (
    rows.find((row) => row.phoneNumber?.replace(/\D/g, "") === digits) ?? null
  );
}

/** A Game link has no clock of its own; the other doors' links last 6 hours. */
export function inviteLinkLifetimeNote(kind: InviteDoorKind, locale: Locale) {
  const m = messagesFor(locale).invite.door.linkLifetime;
  return kind === "game" ? m.game : m.other;
}

export function inviteLinkEmptyNote(locale: Locale) {
  return messagesFor(locale).invite.door.linkEmptyNote;
}

export function inviteLinkNote(kind: InviteDoorKind, locale: Locale) {
  return messagesFor(locale).invite.door.linkNote[kind];
}

export function copyLinkLabel(copied: boolean, locale: Locale) {
  const m = messagesFor(locale).common;
  return copied ? m.copied : m.copy;
}

/** iOS reads the body after `&`, Android after `?`. */
export function textMessageUrl(
  platform: string,
  to: string | null,
  body: string,
) {
  const separator = platform === "ios" ? "&" : "?";
  return `sms:${to ?? ""}${separator}body=${encodeURIComponent(body)}`;
}

export function pendingHeading(count: number, locale: Locale) {
  return messagesFor(locale).invite.door.pendingHeading(count);
}

export function pendingNote(locale: Locale) {
  return messagesFor(locale).invite.door.pendingNote;
}

export function noPendingCopy(locale: Locale) {
  return messagesFor(locale).invite.door.noPending;
}
