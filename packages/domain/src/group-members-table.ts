import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatDayMonth } from "./format-game-start";
import type { GroupMemberTierData, GroupTierSummaryData } from "./group-data";
import { groupHomeShowsMemberSearch } from "./group-home-chrome";
import { tierBandLabel, type TierBand } from "./tier-bands";
import { TIER_PROVISIONAL_GAMES } from "./tier-points";

/**
 * The Members tab table (design "Group members" 2a–2f, Seasons revision):
 * one row per member with their overall Level. Highest Level first, a member
 * with no Level last, ties by name. On football the Level reads as OVR, and
 * the whole-number OVR orders the rows, so two members who share a one-decimal
 * Level still read in the order of the OVR they show. Games played and Matches
 * won live on the Standing tab, not here.
 */

type SortableMember = {
  name: string | null;
  level: string | null;
  ovr?: number | null;
};

function sortValue(value: number | null | undefined) {
  return value == null || Number.isNaN(value)
    ? Number.NEGATIVE_INFINITY
    : value;
}

function levelValue(member: SortableMember) {
  return sortValue(member.level == null ? null : Number(member.level));
}

function higherFirst(left: number, right: number) {
  return left === right ? 0 : right > left ? 1 : -1;
}

export function sortGroupMembers<T extends SortableMember>(
  members: readonly T[],
): T[] {
  return [...members].sort(
    (left, right) =>
      higherFirst(sortValue(left.ovr), sortValue(right.ovr)) ||
      higherFirst(levelValue(left), levelValue(right)) ||
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

export type GroupMemberSort = "recent" | "joined" | "name" | "level" | "tier";

/**
 * The sorts the Members tab offers: Level only on a Group that shows Levels,
 * Tier only on a tier Group.
 */
export function groupMemberSorts(
  showLevel: boolean,
  showTier = false,
): GroupMemberSort[] {
  if (showTier) {
    return ["tier", "recent", "joined", "name"];
  }
  return showLevel
    ? ["recent", "joined", "name", "level"]
    : ["recent", "joined", "name"];
}

export function defaultGroupMemberSort(
  showLevel: boolean,
  showTier = false,
): GroupMemberSort {
  if (showTier) {
    return "tier";
  }
  return showLevel ? "level" : "recent";
}

type DatedMember = SortableMember & {
  lastPlayedAt: Date | string | null | undefined;
  joinedAt: Date | string | null | undefined;
  tier?: GroupMemberTierData | null;
};

/** Ranked members by place, then Provisional ones by games played. */
function byTier(
  left: { tier?: GroupMemberTierData | null },
  right: { tier?: GroupMemberTierData | null },
) {
  const rank = (tier: GroupMemberTierData | null | undefined) =>
    tier?.place ?? Number.POSITIVE_INFINITY;
  const leftRank = rank(left.tier);
  const rightRank = rank(right.tier);
  if (leftRank !== rightRank) {
    return leftRank < rightRank ? -1 : 1;
  }
  return (right.tier?.gamesOfFive ?? -1) - (left.tier?.gamesOfFive ?? -1);
}

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
    if (sort === "tier") {
      return byTier(left, right);
    }
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
  if (sort === "name" || sort === "level" || sort === "tier") {
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

const SORTS: readonly GroupMemberSort[] = [
  "recent",
  "joined",
  "name",
  "level",
  "tier",
];
const FILTERS: readonly GroupMemberFilter[] = [
  "all",
  "organizers",
  "active",
  "inactive",
  "noGames",
  "notOnTemba",
];

/** Reads a stored sort back; anything unknown is `null`. */
export function asGroupMemberSort(value: unknown): GroupMemberSort | null {
  return SORTS.find((sort) => sort === value) ?? null;
}

export function asGroupMemberFilter(value: unknown): GroupMemberFilter | null {
  return FILTERS.find((filter) => filter === value) ?? null;
}

type LensMember = DatedMember & {
  isOrganizer: boolean;
  unclaimed: boolean;
};

export type GroupMembersLensInput = {
  query: string;
  /** The viewer's picks; `null` or one not on offer means the default. */
  sort: GroupMemberSort | null;
  filter: GroupMemberFilter | null;
  showLevel: boolean;
  /** A tier Group orders by tier first. */
  showTier?: boolean;
  /** Offers the Not on Temba filter. */
  canManage: boolean;
  now: Date;
  locale: Locale;
};

/**
 * The Members tab under its search, sort and filter (design "Group members"
 * 4a–4d). The controls show only once the Group is big enough to search;
 * until then the table reads in the default order, unfiltered.
 */
export function groupMembersLens<T extends LensMember>(
  members: readonly T[],
  input: GroupMembersLensInput,
) {
  const m = messagesFor(input.locale).group;
  const lens = m.members.lens;
  const showControls = groupHomeShowsMemberSearch(members.length);
  const sorts = groupMemberSorts(input.showLevel, input.showTier);
  const filters = groupMemberFilters(input.canManage);
  const sort =
    showControls && input.sort && sorts.includes(input.sort)
      ? input.sort
      : defaultGroupMemberSort(input.showLevel, input.showTier);
  const filter =
    showControls && input.filter && filters.includes(input.filter)
      ? input.filter
      : "all";
  const needle = showControls ? input.query.trim() : "";
  const lowered = needle.toLowerCase();
  const rows = sortGroupMembersBy(
    members.filter(
      (member) =>
        groupMemberMatchesFilter(member, filter, input.now) &&
        (member.name ?? "").toLowerCase().includes(lowered),
    ),
    sort,
    input.locale,
  );
  const narrowed = filter !== "all" || needle !== "";
  return {
    showControls,
    sort,
    filter,
    rows,
    countLine: narrowed
      ? lens.countOf(rows.length, members.length)
      : String(members.length),
    emptyText: needle
      ? filter === "all"
        ? lens.noMatchQuery(needle)
        : lens.noMatchQueryIn(needle, lens.filters[filter])
      : lens.noneIn(lens.filters[filter]),
    sortLabel: lens.sort.options[sort].label,
    sorts: sorts.map((id) => ({
      id,
      ...lens.sort.options[id],
      selected: id === sort,
    })),
    filters: filters.map((id) => {
      const count = members.filter((member) =>
        groupMemberMatchesFilter(member, id, input.now),
      ).length;
      return {
        id,
        label: lens.filters[id],
        count,
        selected: id === filter,
        accessibilityLabel: lens.filterSpoken(
          lens.filters[id],
          m.memberCount(count),
        ),
      };
    }),
  };
}

export type GroupMembersLens = ReturnType<typeof groupMembersLens>;
export type GroupMemberSortOption = GroupMembersLens["sorts"][number];
export type GroupMemberFilterChip = GroupMembersLens["filters"][number];

/** The table footer; nothing to explain on a Group without Levels or a tier. */
export function groupMembersLegend(input: {
  showLevel: boolean;
  showTier?: boolean;
  locale: Locale;
}) {
  const m = messagesFor(input.locale);
  if (input.showTier) {
    return m.rating.tier.footnote;
  }
  return input.showLevel ? m.group.members.legend : null;
}

/** Tier points with thousands grouped, always in Latin digits. */
export function formatTierPoints(points: number) {
  return String(Math.round(points)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export type GroupMemberTierCell =
  | { kind: "fish"; band: TierBand; label: string }
  | { kind: "place"; label: string }
  | { kind: "provisional"; label: string };

export type GroupMemberTierView = {
  cell: GroupMemberTierCell;
  caption: string | null;
  points: string;
  /** "no tier" reads muted, as on screen 2b. */
  pointsMuted: boolean;
  /** The tier cell and the points, for a row whose caption says something else. */
  spoken: string;
  /** The points alone, for a row whose caption already names the tier. */
  pointsSpoken: string;
};

/**
 * A Members row on a tier Group (screen 2b): the fish, or the place while
 * fewer than four are ranked, or a hatched Provisional slot; the band and
 * role as the caption; the points, or "no tier" while Provisional.
 */
export function groupMemberTierView(
  member: {
    tier?: GroupMemberTierData | null;
    isOrganizer: boolean;
  },
  locale: Locale,
): GroupMemberTierView | null {
  const tier = member.tier;
  if (!tier) {
    return null;
  }
  const m = messagesFor(locale);
  const copy = m.rating.tier;
  if (tier.provisional || tier.place == null) {
    const caption = copy.provisionalGames(
      tier.gamesOfFive,
      TIER_PROVISIONAL_GAMES,
    );
    return {
      cell: { kind: "provisional", label: m.rating.provisional },
      caption,
      points: copy.noTier,
      pointsMuted: true,
      spoken: [caption, copy.noTier].join(". "),
      pointsSpoken: copy.noTier,
    };
  }
  const points = formatTierPoints(tier.points ?? 0);
  if (tier.band) {
    const band = tierBandLabel(tier.band, locale);
    const caption = member.isOrganizer ? copy.withOrganizer(band) : band;
    return {
      cell: { kind: "fish", band: tier.band, label: band },
      caption,
      points,
      pointsMuted: false,
      spoken: [band, copy.pointsSpoken(points)].join(". "),
      pointsSpoken: copy.pointsSpoken(points),
    };
  }
  const place = copy.place(tier.place);
  const caption = member.isOrganizer ? m.group.members.organizer : null;
  return {
    cell: { kind: "place", label: place },
    caption,
    points,
    pointsMuted: false,
    spoken: [place, copy.pointsSpoken(points)].join(". "),
    pointsSpoken: copy.pointsSpoken(points),
  };
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The Shark card above a tier Group's Members table, null without fish. */
export function groupTierSharkCard(
  summary: GroupTierSummaryData | null | undefined,
  now: Date,
  locale: Locale,
) {
  const shark = summary?.shark;
  if (!shark) {
    return null;
  }
  const m = messagesFor(locale);
  const points = formatTierPoints(shark.points);
  const since = asValidDate(shark.since);
  const weeks = since
    ? Math.floor((now.getTime() - since.getTime()) / WEEK_MS)
    : 0;
  return {
    title: m.rating.tier.theShark,
    name: shark.name,
    line:
      weeks >= 1
        ? m.rating.tier.sharkFor(points, weeks)
        : m.rating.tier.points(points),
    fishLabel: tierBandLabel("shark", locale),
  };
}

/** "2 still provisional" under a tier Group's table; null when nobody is. */
export function groupTierProvisionalLine(
  summary: GroupTierSummaryData | null | undefined,
  locale: Locale,
) {
  return summary && summary.provisionalCount > 0
    ? messagesFor(locale).rating.tier.stillProvisional(summary.provisionalCount)
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
