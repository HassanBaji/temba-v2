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

export type GroupMemberSort = "recent" | "joined" | "name" | "level";

/** The sorts the Members tab offers; Level only on a Group that shows Levels. */
export function groupMemberSorts(showLevel: boolean): GroupMemberSort[] {
  return showLevel
    ? ["recent", "joined", "name", "level"]
    : ["recent", "joined", "name"];
}

export function defaultGroupMemberSort(showLevel: boolean): GroupMemberSort {
  return showLevel ? "level" : "recent";
}

type DatedMember = SortableMember & {
  lastPlayedAt: Date | string | null | undefined;
  joinedAt: Date | string | null | undefined;
};

function newestFirst(
  left: Date | string | null | undefined,
  right: Date | string | null | undefined,
) {
  const leftTime = asValidDate(left)?.getTime() ?? Number.NEGATIVE_INFINITY;
  const rightTime = asValidDate(right)?.getTime() ?? Number.NEGATIVE_INFINITY;
  if (leftTime === rightTime) {
    return 0;
  }
  return rightTime > leftTime ? 1 : -1;
}

/**
 * Orders the members table. Every sort puts unknown values last and breaks
 * ties by name; Recently played breaks a tie on the last game by join date.
 */
export function sortGroupMembersBy<T extends DatedMember>(
  members: readonly T[],
  sort: GroupMemberSort,
  locale: Locale,
): T[] {
  if (sort === "level") {
    return sortGroupMembers(members);
  }
  const byName = (left: T, right: T) =>
    (left.name ?? "").localeCompare(right.name ?? "", locale, {
      sensitivity: "base",
    });
  const compare = (left: T, right: T) => {
    if (sort === "recent") {
      return (
        newestFirst(left.lastPlayedAt, right.lastPlayedAt) ||
        newestFirst(left.joinedAt, right.joinedAt)
      );
    }
    if (sort === "joined") {
      return newestFirst(left.joinedAt, right.joinedAt);
    }
    return 0;
  };
  return [...members].sort(
    (left, right) => compare(left, right) || byName(left, right),
  );
}

export type GroupMemberFilter =
  | "all"
  | "organizers"
  | "active"
  | "inactive"
  | "noGames"
  | "notOnTemba";

/** Active means a game in this Group within this many days; Inactive, not since. */
export const GROUP_MEMBER_ACTIVE_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Not on Temba is offered only to someone who can manage the members. */
export function groupMemberFilters(canManage: boolean): GroupMemberFilter[] {
  const filters: GroupMemberFilter[] = [
    "all",
    "organizers",
    "active",
    "inactive",
    "noGames",
  ];
  return canManage ? [...filters, "notOnTemba"] : filters;
}

export function groupMemberMatchesFilter(
  member: {
    isOrganizer: boolean;
    unclaimed: boolean;
    lastPlayedAt: Date | string | null | undefined;
  },
  filter: GroupMemberFilter,
  now: Date,
) {
  const lastPlayed = asValidDate(member.lastPlayedAt);
  const activeSince = now.getTime() - GROUP_MEMBER_ACTIVE_DAYS * DAY_MS;
  switch (filter) {
    case "all":
      return true;
    case "organizers":
      return member.isOrganizer;
    case "active":
      return lastPlayed != null && lastPlayed.getTime() >= activeSince;
    case "inactive":
      return lastPlayed != null && lastPlayed.getTime() < activeSince;
    case "noGames":
      return lastPlayed == null;
    case "notOnTemba":
      return member.unclaimed;
  }
}

/**
 * The row's second line under a sort: Recently played reads the last game
 * (or the join date before one), Recently joined reads the join date for
 * everyone, Organizers included. Name and Level read as
 * {@link groupMemberTableCaption}.
 */
export function groupMemberSortCaption(
  member: {
    isOrganizer: boolean;
    lastPlayedAt: Date | string | null | undefined;
    joinedAt: Date | string | null | undefined;
  },
  sort: GroupMemberSort,
  locale: Locale,
) {
  if (sort === "name" || sort === "level") {
    return groupMemberTableCaption(member, locale);
  }
  const m = messagesFor(locale).group.members;
  const day = (date: Date) =>
    formatDayMonth(date, locale, { weekday: "short" });
  const lastPlayed = asValidDate(member.lastPlayedAt);
  const joined = asValidDate(member.joinedAt);
  if (sort === "recent" && lastPlayed) {
    return member.isOrganizer
      ? m.organizerLastPlayed(day(lastPlayed))
      : m.lastPlayed(day(lastPlayed));
  }
  if (!joined) {
    return member.isOrganizer ? m.organizer : null;
  }
  if (sort === "recent") {
    return member.isOrganizer
      ? m.organizerNoGamesJoined(day(joined))
      : m.noGamesJoined(day(joined));
  }
  return member.isOrganizer
    ? m.organizerJoined(day(joined))
    : m.joined(day(joined));
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
