import { formatDayMonth } from "./format-game-start";

/**
 * The Members tab table (design "Group members" 2a–2f): one row per member
 * with Games played (P), Matches won (W) and Level columns, sortable by any of
 * the three.
 */

export type GroupMembersSort = "played" | "won" | "level";

export const GROUP_MEMBERS_DEFAULT_SORT: GroupMembersSort = "played";

type SortableMember = {
  name: string | null;
  totalGamesPlayed: number;
  wins: number;
  level: string | null;
};

function byPlayed(left: SortableMember, right: SortableMember) {
  return (
    right.totalGamesPlayed - left.totalGamesPlayed ||
    right.wins - left.wins ||
    (left.name ?? "").localeCompare(right.name ?? "")
  );
}

function levelValue(member: SortableMember) {
  const value = member.level == null ? Number.NaN : Number(member.level);
  return Number.isNaN(value) ? Number.NEGATIVE_INFINITY : value;
}

/**
 * Highest first. Ties fall back to Games played, then Matches won, then name,
 * so the order is stable. A member with no Level sorts last under Level.
 */
export function sortGroupMembers<T extends SortableMember>(
  members: readonly T[],
  sort: GroupMembersSort,
): T[] {
  const compare =
    sort === "won"
      ? (left: T, right: T) => right.wins - left.wins || byPlayed(left, right)
      : sort === "level"
        ? (left: T, right: T) => {
            const delta = levelValue(right) - levelValue(left);
            return Number.isNaN(delta) || delta === 0
              ? byPlayed(left, right)
              : delta;
          }
        : byPlayed;
  return [...members].sort(compare);
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
export function groupMemberTableCaption(member: {
  isOrganizer: boolean;
  lastPlayedAt: Date | string | null | undefined;
  joinedAt: Date | string | null | undefined;
}) {
  if (member.isOrganizer) {
    return "Organizer";
  }
  const lastPlayed = asValidDate(member.lastPlayedAt);
  if (lastPlayed) {
    return `Last ${formatDayMonth(lastPlayed, { weekday: "short" })}`;
  }
  const joined = asValidDate(member.joinedAt);
  return joined
    ? `Joined ${formatDayMonth(joined, { weekday: "short" })}`
    : null;
}

/**
 * The table footer. Manage mode drops the W column to make room for each
 * row's actions button, so the legend drops it too.
 */
export function groupMembersLegend(input: {
  managing: boolean;
  showLevel: boolean;
}) {
  const columns = input.managing
    ? "P Games played in this Group."
    : "P Games played, W Matches won in this Group.";
  return input.showLevel
    ? `${columns} Hatched Levels are still Provisional.`
    : columns;
}

export const GROUP_MEMBERS_NO_MATCH_COPY = "Nobody matches.";

export function groupPendingInvitesTitle(count: number) {
  return `${count} ${count === 1 ? "invite" : "invites"} pending`;
}

export function groupPendingInviteCaption(invitedAt: Date | string) {
  const date = asValidDate(invitedAt);
  return date ? `Invited ${formatDayMonth(date, { weekday: "short" })}` : null;
}
