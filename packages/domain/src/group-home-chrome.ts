import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { displayLabelFromStoredBand, type LevelBand } from "./level-bands";
import { formatMonth } from "./format-game-start";
import { memberCountLabel } from "./member-count-label";
import { sportLabel } from "./sport";

export function groupHomeSportLabel(
  sport: string | null | undefined,
  locale: Locale,
) {
  return sportLabel(sport, locale);
}

function sinceMonth(
  createdAt: Date | string | null | undefined,
  locale: Locale,
) {
  if (createdAt == null) {
    return null;
  }
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatMonth(date, "short", locale);
}

/**
 * The Group home header meta line: `"{Sport}, {n} members, since {Mon}"`, the
 * month the Group was created. It names no Season: a Season has its own dates
 * and may start long after the Group.
 *
 * Parts with no value are dropped and the remainder joined with `", "`, so a
 * Group with no sport reads `"14 members, since Jan"`. Returns an empty
 * string when nothing is known; the header renders no meta line then.
 */
export function groupHomeMetaLine(input: {
  sport: string | null | undefined;
  memberCount: number | null | undefined;
  createdAt: Date | string | null | undefined;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).group;
  const parts: string[] = [];

  const sport = groupHomeSportLabel(input.sport, input.locale);
  if (sport) {
    parts.push(sport);
  }

  const memberCount = input.memberCount;
  if (memberCount != null && Number.isFinite(memberCount)) {
    parts.push(memberCountLabel(memberCount, input.locale));
  }

  const since = sinceMonth(input.createdAt, input.locale);
  if (since) {
    parts.push(m.home.since(since));
  }

  return parts.join(m.metaSeparator);
}

export type GroupHomeBackTarget =
  | { kind: "community"; communityId: string; label: string }
  | { kind: "groups"; label: string };

/** A Club Group home returns to its Community; a Loose Group to Groups. */
export function groupHomeBackTarget(
  communityId: string | null | undefined,
  locale: Locale,
): GroupHomeBackTarget {
  const m = messagesFor(locale).group.home;
  if (communityId) {
    return { kind: "community", communityId, label: m.backToCommunity };
  }
  return { kind: "groups", label: m.backToGroups };
}

export function groupHomeHasStandingResults(
  members: readonly { played: number }[],
) {
  return members.some((member) => member.played > 0);
}

export function groupHomeShowsMemberSearch(memberCount: number) {
  return memberCount > 8;
}

export function filterGroupMembersByName<T extends { name: string }>(
  members: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return [...members];
  }
  return members.filter((member) => member.name.toLowerCase().includes(needle));
}

export type GroupMemberOrganizerAction = "appoint" | "dismiss";

/**
 * A Group approver may remove any player but the Organizers by role: the
 * Group creator and, on a Club Group, Community Owner and Admin. An Appointed
 * Organizer is removable like any other member. Nobody removes themself here;
 * that is Leave.
 */
export function groupMemberIsRemovable(member: {
  isViewer: boolean;
  isOrganizer: boolean;
  isAppointedOrganizer: boolean;
}) {
  if (member.isViewer) {
    return false;
  }
  return !member.isOrganizer || member.isAppointedOrganizer;
}

/**
 * Only an Appointed Organizer can be dismissed: the Group creator and
 * Community Owner and Admin are Organizers by role, and an Unclaimed player
 * cannot sign in to organize.
 */
export function groupMemberOrganizerAction(member: {
  isViewer: boolean;
  unclaimed: boolean;
  isOrganizer: boolean;
  isAppointedOrganizer: boolean;
}): GroupMemberOrganizerAction | null {
  if (member.isViewer || member.unclaimed) {
    return null;
  }
  if (member.isAppointedOrganizer) {
    return "dismiss";
  }
  return member.isOrganizer ? null : "appoint";
}

export function groupMemberOrganizerActionLabel(
  action: GroupMemberOrganizerAction,
  locale: Locale,
) {
  return messagesFor(locale).group.home.organizerAction[action];
}

export function groupMemberOrganizerActionHint(
  action: GroupMemberOrganizerAction,
  locale: Locale,
) {
  return messagesFor(locale).group.home.organizerHint[action];
}

export function groupMemberOrganizerToast(
  action: GroupMemberOrganizerAction,
  name: string,
  locale: Locale,
) {
  const m = messagesFor(locale).group.home.organizerToast;
  return action === "appoint" ? m.appointed(name) : m.dismissed(name);
}

/** The Standing W-L column: `{wins}-{losses}`, drawn even at `0-0`. */
export function groupStandingRecordLabel(wins: number, losses: number) {
  return `${wins}-${losses}`;
}

export type LevelCellView =
  | { kind: "label"; label: string }
  | { kind: "provisional"; label: string | null };

/**
 * The Level column: the band label, or the hatched Provisional placeholder
 * when the Rating is still Provisional (ADR-0009) or the member has no Rating
 * for the Group's sport. A Provisional member with a band still carries its
 * letter, for the Members tab to draw on the hatch.
 */
export function levelCellView(
  band: LevelBand | null | undefined,
  provisional: boolean,
): LevelCellView {
  if (!band) {
    return { kind: "provisional", label: null };
  }
  const label = displayLabelFromStoredBand(band);
  return provisional
    ? { kind: "provisional", label }
    : { kind: "label", label };
}

/** A football Group has no Level until football results and Ratings exist. */
export function groupShowsLevel(sport: string | null | undefined) {
  return sport !== "football";
}
