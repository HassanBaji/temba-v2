import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";

/**
 * The Members tab table (design "Group members" 2a–2f, Seasons revision):
 * one row per member with their overall Level. Highest Level first, a member
 * with no Level last, ties by name. Games played and Matches won live on the
 * Standing tab, not here.
 */

type SortableMember = {
  name: string | null;
  level: string | null;
};

function levelValue(member: SortableMember) {
  const value = member.level == null ? Number.NaN : Number(member.level);
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

export function sortGroupMembers<T extends SortableMember>(
  members: readonly T[],
): T[] {
  return [...members].sort(
    (left, right) =>
      levelValue(right) - levelValue(left) ||
      (left.name ?? "").localeCompare(right.name ?? ""),
  );
}

function asValidDate(value: Date | string | null | undefined) {
  if (value == null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * The row's second line: **Organizer**, otherwise when the member last played
 * here (`"Last Fri 24 Oct"`), otherwise when they joined (`"Joined Wed 22
 * Oct"`). `null` when none of those is known.
 */
export function groupMemberTableCaption(
  member: {
    isOrganizer: boolean;
    lastPlayedAt: Date | string | null | undefined;
    joinedAt: Date | string | null | undefined;
  },
  locale: Locale,
) {
  const m = messagesFor(locale).group.members;
  if (member.isOrganizer) {
    return m.organizer;
  }
  const lastPlayed = asValidDate(member.lastPlayedAt);
  if (lastPlayed) {
    return m.lastPlayed(
      formatDayMonth(lastPlayed, locale, { weekday: "short" }),
    );
  }
  const joined = asValidDate(member.joinedAt);
  return joined
    ? m.joined(formatDayMonth(joined, locale, { weekday: "short" }))
    : null;
}

/** The table footer; nothing to explain on a Group without Levels. */
export function groupMembersLegend(input: {
  showLevel: boolean;
  locale: Locale;
}) {
  return input.showLevel
    ? messagesFor(input.locale).group.members.legend
    : null;
}

export function groupPendingInvitesTitle(count: number, locale: Locale) {
  return messagesFor(locale).group.members.pendingInvitesTitle(count);
}

export function groupPendingInviteCaption(
  invitedAt: Date | string,
  locale: Locale,
) {
  const date = asValidDate(invitedAt);
  return date
    ? messagesFor(locale).group.members.invited(
        formatDayMonth(date, locale, { weekday: "short" }),
      )
    : null;
}
