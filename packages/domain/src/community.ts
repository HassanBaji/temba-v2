import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import {
  clubGroupRowMetaLine,
  communityHomeMetaLine,
  communityRoleLabel,
  type CommunityRoleName,
  type CommunityVisibility,
} from "./community-chrome";
import type {
  CommunityClubGroupData,
  CommunityHomeData,
  CommunityJoinRequestData,
  CommunityLiveVenueData,
  CommunityMemberData,
  CommunityTeamData,
  CommunityTeamLinkRequestData,
  CommunityVenueData,
  CommunityVenueLinkRequestData,
} from "./community-data";
import type { CommunityHomeTab } from "./community-home-tab";
import {
  COMMUNITY_ROLES,
  type CommunityRoleChange,
  roleChangeNeedsConfirmation,
} from "./community-role-change";
import {
  filterGroupMembersByName,
  groupHomeShowsMemberSearch,
  groupHomeSportLabel,
} from "./group-home-chrome";
import { requestRowMeta } from "./request-meta";
import { isSport } from "./sport";
import { teamSeatsToComplete } from "./team-roster";

export function communityRoleUpdatedToast(
  role: CommunityRoleName,
  locale: Locale,
) {
  return messagesFor(locale).community.toast.roleUpdated(
    communityRoleLabel(role, locale),
  );
}

export function communityTypeHelp(type: CommunityVisibility, locale: Locale) {
  const m = messagesFor(locale).community.create;
  return type === "private" ? m.privateHelp : m.publicHelp;
}

export function communityIsLive(data: Pick<CommunityHomeData, "archivedAt">) {
  return !data.archivedAt;
}

export function communityIsMember(data: Pick<CommunityHomeData, "membership">) {
  return data.membership != null;
}

export function communityCanRequestJoin(
  data: Pick<
    CommunityHomeData,
    "type" | "archivedAt" | "membership" | "joinRequest"
  >,
) {
  return (
    data.type === "public" &&
    communityIsLive(data) &&
    !communityIsMember(data) &&
    data.joinRequest?.status !== "pending"
  );
}

export function communityShowsRequestsTab(
  data: Pick<CommunityHomeData, "canManageJoinRequests" | "canManageTeamLinks">,
) {
  return data.canManageJoinRequests || data.canManageTeamLinks;
}

export function communityAvailableTabs(
  data: Pick<
    CommunityHomeData,
    "membership" | "canManageJoinRequests" | "canManageTeamLinks"
  >,
): CommunityHomeTab[] {
  return [
    "groups",
    ...(communityIsMember(data) ? (["teams", "members"] as const) : []),
    ...(communityShowsRequestsTab(data) ? (["requests"] as const) : []),
  ];
}

export function communityRequestCount(counts: {
  join: number | undefined;
  team: number | undefined;
}) {
  return (counts.join ?? 0) + (counts.team ?? 0);
}

export function communityCanInvite(
  data: Pick<
    CommunityHomeData,
    "canManageLookupInvites" | "canManageInviteLinks"
  >,
) {
  return data.canManageLookupInvites || data.canManageInviteLinks;
}

export function communityStatusBadges(input: {
  isArchived: boolean;
  joinStatus: string | null;
  locale: Locale;
}) {
  const m = messagesFor(input.locale).community.badge;
  const badges: string[] = [];
  if (input.isArchived) {
    badges.push(m.softArchived);
  }
  if (input.joinStatus === "pending") {
    badges.push(m.joinPending);
  }
  if (input.joinStatus === "rejected") {
    badges.push(m.joinRejected);
  }
  return badges;
}

export type CommunityHomeHeader = {
  name: string;
  meta: string;
  badges: string[];
};

export function communityHomeHeader(
  data: CommunityHomeData,
  locale: Locale,
): CommunityHomeHeader {
  const member = communityIsMember(data);
  return {
    name: data.name || messagesFor(locale).community.fallbackName,
    meta: communityHomeMetaLine({
      type: data.type,
      sports: data.sports,
      memberCount: data.memberCount,
      role: data.membership?.role ?? null,
      locale,
    }),
    badges: communityStatusBadges({
      isArchived: !communityIsLive(data),
      joinStatus: member ? null : (data.joinRequest?.status ?? null),
      locale,
    }),
  };
}

export type CommunityBanner = { heading: string; body: string };

export function communityArchiveBanner(
  data: Pick<CommunityHomeData, "archivedAt" | "membership">,
  locale: Locale,
): CommunityBanner | null {
  if (communityIsLive(data)) {
    return null;
  }
  const m = messagesFor(locale).community.archiveBanner;
  if (communityIsMember(data)) {
    return { heading: m.member.heading, body: m.member.body };
  }
  return { heading: m.visitor.heading, body: m.visitor.body };
}

export function communityLeaveNotices(
  data: Pick<
    CommunityHomeData,
    "membership" | "canLeave" | "linkedTeamBlocksLeave"
  >,
  locale: Locale,
) {
  const m = messagesFor(locale).community;
  const notices: string[] = [];
  if (data.linkedTeamBlocksLeave) {
    notices.push(m.linkedTeamBlocksLeave);
  }
  if (
    data.membership?.role === "owner" &&
    data.canLeave === false &&
    !data.linkedTeamBlocksLeave
  ) {
    notices.push(m.lastOwner);
  }
  return notices;
}

export type CommunityHomeActions = {
  canInvite: boolean;
  canCreateClubGroup: boolean;
  canUnarchive: boolean;
  canLeave: boolean;
  canSoftArchive: boolean;
};

export function communityHomeActions(
  data: CommunityHomeData,
): CommunityHomeActions {
  return {
    canInvite: communityCanInvite(data),
    canCreateClubGroup: data.canCreateClubGroup,
    canUnarchive: data.canUnarchive,
    canLeave: communityIsMember(data),
    canSoftArchive: data.canSoftArchive,
  };
}

export function communityLeaveConfirm(name: string, locale: Locale) {
  const m = messagesFor(locale).community;
  return {
    title: m.leaveConfirm.title(name),
    description: m.leaveConfirm.description,
    confirmLabel: m.action.leave,
  };
}

export function communityArchiveConfirm(name: string, locale: Locale) {
  const m = messagesFor(locale).community;
  return {
    title: m.archiveConfirm.title(name),
    description: m.archiveConfirm.description,
    confirmLabel: m.action.softArchive,
  };
}

export function communityUnlinkVenueConfirm(
  venueName: string | null,
  locale: Locale,
) {
  const m = messagesFor(locale).community;
  return {
    title: venueName
      ? m.unlinkVenueConfirm.title(venueName)
      : m.unlinkVenueConfirm.titleGeneric,
    description: m.unlinkVenueConfirm.description,
    confirmLabel: m.action.unlinkVenue,
  };
}

export function venueLocation(
  venue: { city: string; country: string },
  locale: Locale,
) {
  return messagesFor(locale).community.venue.location(
    venue.city,
    venue.country,
  );
}

export type CommunityVenueView = {
  venue: CommunityVenueData | null;
  location: string | null;
  courtNames: string[];
  notes: string[];
  canRequestLink: boolean;
  canUnlink: boolean;
};

function venueRequestNotes(
  request: CommunityVenueLinkRequestData | null,
  hasVenue: boolean,
  canManage: boolean,
  locale: Locale,
) {
  if (!canManage || !request) {
    return [];
  }
  const m = messagesFor(locale).community.venue;
  const where = `${request.venue.name} (${venueLocation(request.venue, locale)})`;
  if (request.status === "pending") {
    return [m.requestPending(where)];
  }
  if (request.status === "rejected" && !hasVenue) {
    return [m.requestRejected(request.venue.name)];
  }
  return [];
}

export function communityVenueView(
  data: CommunityHomeData,
  locale: Locale,
): CommunityVenueView {
  return {
    venue: data.venue,
    location: data.venue ? venueLocation(data.venue, locale) : null,
    courtNames: data.venue?.courts.map((court) => court.name) ?? [],
    notes: venueRequestNotes(
      data.venueLinkRequest,
      data.venue != null,
      data.canManageVenueLink,
      locale,
    ),
    canRequestLink: data.venue == null && data.canRequestVenueLink,
    canUnlink: data.venue != null && data.canUnlinkVenue,
  };
}

export type CommunityClubGroupRow = {
  id: string;
  name: string;
  imageUrl: string | null;
  meta: string;
  joined: boolean;
  accessibilityLabel: string;
};

export function communityClubGroupRow(
  group: CommunityClubGroupData,
  locale: Locale,
): CommunityClubGroupRow {
  const m = messagesFor(locale);
  const name = group.name ?? m.group.untitled;
  const meta = clubGroupRowMetaLine({
    type: group.type,
    memberCount: group.memberCount,
    locale,
  });
  return {
    id: group.id,
    name,
    imageUrl: group.imageUrl,
    meta,
    joined: group.isMember,
    accessibilityLabel: [name, meta, group.isMember ? m.community.joined : null]
      .filter(Boolean)
      .join(m.group.metaSeparator),
  };
}

export function communityTeamRow(team: CommunityTeamData, locale: Locale) {
  return {
    id: team.id,
    displayName: team.displayName,
    sport: groupHomeSportLabel(team.sport, locale),
    people: team.members,
    openSeats: teamSeatsToComplete(
      team.members.length,
      isSport(team.sport) ? team.sport : "padel",
    ),
  };
}

export type CommunityMemberRow = {
  id: string;
  userId: string;
  name: string;
  displayName: string;
  image: string | null;
  email: string | null;
  role: CommunityRoleName;
  roleLabel: string;
  isSelf: boolean;
};

export function communityMemberList(
  members: readonly CommunityMemberData[],
  viewerUserId: string | undefined,
  query: string,
  locale: Locale,
) {
  const m = messagesFor(locale);
  const rows: CommunityMemberRow[] = members.map((member) => {
    const name = member.user.name ?? m.community.memberFallback;
    const isSelf = member.user.id === viewerUserId;
    return {
      id: member.id,
      userId: member.user.id,
      name,
      displayName: isSelf ? m.common.you : name,
      image: member.user.image,
      email: member.user.email,
      role: member.role,
      roleLabel: communityRoleLabel(member.role, locale),
      isSelf,
    };
  });
  const showSearch = groupHomeShowsMemberSearch(rows.length);
  return {
    isEmpty: rows.length === 0,
    showSearch,
    rows: showSearch ? filterGroupMembersByName(rows, query) : rows,
  };
}

export type CommunityRoleChangeAction = "none" | "apply" | "confirm";

export function communityRoleChangeAction(
  change: CommunityRoleChange,
): CommunityRoleChangeAction {
  if (change.from === change.to) {
    return "none";
  }
  return roleChangeNeedsConfirmation(change) ? "confirm" : "apply";
}

export function communityRoleChoices(locale: Locale) {
  return COMMUNITY_ROLES.map((role) => ({
    value: role,
    label: communityRoleLabel(role, locale),
  }));
}

export function communityJoinRequestRow(
  request: CommunityJoinRequestData,
  locale: Locale,
  now?: Date,
) {
  const name = request.user.name ?? messagesFor(locale).community.userFallback;
  return {
    id: request.id,
    title: name,
    image: request.user.image,
    meta: requestRowMeta(request.createdAt, locale, [], now),
  };
}

export function communityTeamLinkRequestRow(
  request: CommunityTeamLinkRequestData,
  locale: Locale,
  now?: Date,
) {
  const m = messagesFor(locale).community;
  const requester = request.requestedBy.name ?? m.userFallback;
  return {
    id: request.id,
    title: request.team.displayName,
    meta: requestRowMeta(request.createdAt, locale, [m.from(requester)], now),
  };
}

export function communityRequestsAreEmpty(input: {
  canManageJoinRequests: boolean;
  canManageTeamLinks: boolean;
  joinCount: number | undefined;
  teamCount: number | undefined;
  loading: boolean;
  failed: boolean;
}) {
  const joinEmpty = !input.canManageJoinRequests || input.joinCount === 0;
  const teamEmpty = !input.canManageTeamLinks || input.teamCount === 0;
  return joinEmpty && teamEmpty && !input.loading && !input.failed;
}

export function communityLiveVenueRow(
  venue: CommunityLiveVenueData,
  locale: Locale,
) {
  return {
    id: venue.id,
    name: venue.name,
    location: venueLocation(venue, locale),
    accessibilityLabel: messagesFor(locale).community.linkVenue.requestLinkTo(
      venue.name,
    ),
  };
}

export function communityTabLabel(
  tab: CommunityHomeTab,
  requestCount: number,
  locale: Locale,
) {
  const m = messagesFor(locale).community.tab;
  const label = m[tab];
  return tab === "requests" && requestCount > 0
    ? m.withCount(label, requestCount)
    : label;
}
