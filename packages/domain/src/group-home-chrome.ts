import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { formatOvr, type LevelFace } from "./football-ovr";
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

export type GroupHomeBackTarget = { kind: "groups"; label: string };

export function groupHomeBackTarget(locale: Locale): GroupHomeBackTarget {
  return { kind: "groups", label: messagesFor(locale).group.home.backToGroups };
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
 * A Group approver may remove any player but the Group creator, who is an
 * Organizer by role. An Appointed Organizer is removable like any other
 * member. Nobody removes themself here; that is Leave.
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
 * Only an Appointed Organizer can be dismissed: the Group creator is an
 * Organizer by role, and an Unclaimed player cannot sign in to organize.
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

/**
 * An Organizer of the Group (creator or Appointed Organizer) sets other
 * members' Group Levels (ADR-0053). `canCreateGame` is that check for a viewer
 * outside the Standing; the viewer's own Organizer mark is read too.
 */
export function viewerMaySetGroupLevel(group: {
  sport: string | null | undefined;
  canCreateGame: boolean;
  leaderboard: readonly { isViewer: boolean; isOrganizer: boolean }[];
}) {
  return (
    groupShowsLevel(group.sport) &&
    (group.canCreateGame ||
      group.leaderboard.some((entry) => entry.isViewer && entry.isOrganizer))
  );
}

/**
 * An Organizer of a tier Group adjusts other members' Tier points
 * (ADR-0073). The viewer's own Organizer mark is the check: the Group
 * creator or an Appointed Organizer, as the server's.
 */
export function viewerMayAdjustTier(group: {
  hasTier: boolean | undefined;
  leaderboard: readonly { isViewer: boolean; isOrganizer: boolean }[];
}) {
  return (
    group.hasTier === true &&
    group.leaderboard.some((entry) => entry.isViewer && entry.isOrganizer)
  );
}

/** The Standing W-L column: `{wins}–{losses}`, drawn even at `0–0`. */
export function groupStandingRecordLabel(wins: number, losses: number) {
  return `${wins}–${losses}`;
}

export type LevelCellView =
  | { kind: "label"; label: string }
  | { kind: "provisional"; label: string | null };

/**
 * The Level column: the band label, or the hatched Provisional placeholder
 * when the Rating is still Provisional (ADR-0009) or the member has no Rating
 * for the Group's sport. A Provisional member with a band still carries its
 * letter, for the Members tab to draw on the hatch. Given the member's OVR,
 * the label is the football face, `C+ 72` (ADR-0069).
 */
export function levelCellView(
  band: LevelBand | null | undefined,
  provisional: boolean,
  ovr?: number | null,
): LevelCellView {
  if (!band) {
    return { kind: "provisional", label: null };
  }
  const letter = displayLabelFromStoredBand(band);
  const label = ovr == null ? letter : `${letter} ${formatOvr(ovr)}`;
  return provisional
    ? { kind: "provisional", label }
    : { kind: "label", label };
}

/**
 * A tier Group shows fish instead of a Level (ADR-0066); a Verified football
 * Group shows the Level as OVR.
 */
export function groupShowsLevel(
  sport: string | null | undefined,
  verified = false,
) {
  return sport !== "football" || verified;
}

/** How a Group's Level column reads: OVR on football, the Level otherwise. */
export function groupLevelFace(sport: string | null | undefined): LevelFace {
  return sport === "football" ? "ovr" : "level";
}
