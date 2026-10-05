import {
  clubGroupRowMetaLine,
  communityHomeMetaLine,
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

export const COMMUNITIES_TITLE = "Communities";
export const COMMUNITIES_ERROR_TITLE = "Communities could not be loaded";
export const COMMUNITY_ERROR_TITLE = "Community could not be loaded";
export const COMMUNITY_NOT_FOUND_COPY = {
  title: "Community not found",
  description: "It may have been removed, or you may not have access.",
};

export const COMMUNITY_START_COPY = {
  title: "Start a Community",
  description: "Communities organise Club Groups around a Venue.",
  action: "Create Community",
};

export const COMMUNITY_NO_GROUPS_COPY = "No Groups yet";

export const COMMUNITY_CREATE_COPY = {
  title: "Create Community",
  description: "You become the Owner. Groups are optional.",
  publicHelp:
    "People with the Community link ask to join. It isn't listed anywhere yet.",
  privateHelp: "Only people you invite can join.",
  submit: "Create Community",
};

export const COMMUNITY_TYPE_LABELS: Record<CommunityVisibility, string> = {
  public: "Public",
  private: "Private",
};

export const COMMUNITY_ROLE_LABELS: Record<CommunityRoleName, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const COMMUNITY_TAB_LABELS: Record<CommunityHomeTab, string> = {
  groups: "Groups",
  teams: "Teams",
  members: "Members",
  requests: "Requests",
};

export const COMMUNITY_CREATED_TOAST = "Community created";
export const COMMUNITY_JOIN_REQUESTED_TOAST = "Join request sent";
export const COMMUNITY_REQUEST_APPROVED_TOAST = "Request approved";
export const COMMUNITY_REQUEST_REJECTED_TOAST = "Request rejected";
export const COMMUNITY_TEAM_LINKED_TOAST = "Team linked";
export const COMMUNITY_TEAM_LINK_REJECTED_TOAST = "Link request rejected";
export const COMMUNITY_VENUE_LINK_REQUESTED_TOAST = "Venue link requested";
export const COMMUNITY_VENUE_UNLINKED_TOAST = "Venue unlinked";
export const COMMUNITY_LEFT_TOAST = "Left Community and its Club Groups";
export const COMMUNITY_ARCHIVED_TOAST = "Community Soft-archived";
export const COMMUNITY_UNARCHIVED_TOAST = "Community unarchived";
export const COMMUNITY_CLUB_GROUP_CREATED_TOAST = "Club Group created";

export function communityRoleUpdatedToast(role: CommunityRoleName) {
  return `Role updated to ${role}`;
}

export const COMMUNITY_REQUEST_JOIN_LABEL = "Request to join";
export const COMMUNITY_CREATE_CLUB_GROUP_LABEL = "Create Club Group";
export const COMMUNITY_MANAGE_INVITES_LABEL = "Manage invites";
export const COMMUNITY_UNARCHIVE_LABEL = "Unarchive";
export const COMMUNITY_LEAVE_LABEL = "Leave Community";
export const COMMUNITY_SOFT_ARCHIVE_LABEL = "Soft-archive";
export const COMMUNITY_LINK_VENUE_LABEL = "Link a Venue";
export const COMMUNITY_UNLINK_VENUE_LABEL = "Unlink Venue";

export const COMMUNITY_START_CLUB_GROUP_COPY = {
  title: "Start a Club Group",
  description: "Club Groups stay inside this Community.",
};

export const COMMUNITY_CREATE_CLUB_GROUP_DESCRIPTION =
  "A padel Group inside this Community.";

export const COMMUNITY_NO_GROUPS_EMPTY = {
  title: "No Groups yet",
  description: "This Community has no Groups yet.",
};

export const COMMUNITY_NO_TEAMS_EMPTY = {
  title: "No linked Teams",
  description: "This Community has no linked Teams yet.",
};

export const COMMUNITY_NO_MEMBERS_EMPTY = {
  title: "No members yet",
  description: "People who join this Community will show up here.",
};

export const COMMUNITY_MEMBERS_NO_MATCH_COPY = "No members match that name.";

export const COMMUNITY_INVITE_BLOCK_COPY = {
  title: "Invite players",
  description: "Invite players to this Community and its Club Groups.",
  action: "Share invite link",
};

export const COMMUNITY_LOOKUP_NOTE =
  "Owners and Admins can invite people. Invites don't expire.";

export const COMMUNITY_REQUESTS_EMPTY = {
  title: "No pending requests",
  description:
    "Community join requests and Team link requests will show up here.",
};

export const COMMUNITY_JOIN_REQUESTS_TITLE = "Join requests";
export const COMMUNITY_JOIN_REQUESTS_ERROR_TITLE =
  "Join requests could not be loaded";
export const COMMUNITY_TEAM_LINK_REQUESTS_TITLE = "Team link requests";
export const COMMUNITY_TEAM_LINK_REQUESTS_ERROR_TITLE =
  "Team link requests could not be loaded";
export const COMMUNITY_MEMBERS_ERROR_TITLE = "Members could not be loaded";

export const COMMUNITY_LINK_VENUE_COPY = {
  title: "Link a Venue",
  description: "Search live Venues by name, city, or country.",
  searchLabel: "Search Venues",
  none: "No live Venues match.",
  errorTitle: "Venues could not be loaded",
  requestLabel: "Request link",
};

export function communityTypeHelp(type: CommunityVisibility) {
  return type === "private"
    ? COMMUNITY_CREATE_COPY.privateHelp
    : COMMUNITY_CREATE_COPY.publicHelp;
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
}) {
  const badges: string[] = [];
  if (input.isArchived) {
    badges.push("Soft-archived");
  }
  if (input.joinStatus === "pending") {
    badges.push("Join request pending");
  }
  if (input.joinStatus === "rejected") {
    badges.push("Join request rejected");
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
): CommunityHomeHeader {
  const member = communityIsMember(data);
  return {
    name: data.name || "Community",
    meta: communityHomeMetaLine({
      type: data.type,
      sports: data.sports,
      memberCount: data.memberCount,
      role: data.membership?.role ?? null,
    }),
    badges: communityStatusBadges({
      isArchived: !communityIsLive(data),
      joinStatus: member ? null : (data.joinRequest?.status ?? null),
    }),
  };
}

export type CommunityBanner = { heading: string; body: string };

export function communityArchiveBanner(
  data: Pick<CommunityHomeData, "archivedAt" | "membership">,
): CommunityBanner | null {
  if (communityIsLive(data)) {
    return null;
  }
  if (communityIsMember(data)) {
    return {
      heading: "Soft-archived",
      body: "Club Groups stay attached. You can still open Groups and see history and Games. New joins, requests, Lookup invites, and Invite links are paused until an Owner or Admin unarchives.",
    };
  }
  return {
    heading: "This Community is Soft-archived",
    body: "It is not open for new joins, requests, or invites. Members can still open history and Games. This is not a missing page.",
  };
}

export const COMMUNITY_LINKED_TEAM_BLOCKS_LEAVE_COPY =
  "Leave is refused while you sit on a Team linked to this Community. Unlink or dissolve the Team first.";

export const COMMUNITY_LAST_OWNER_COPY =
  "You are the last Owner. Promote someone else before leaving or demoting yourself. Leaving does not Soft-archive this Community.";

export function communityLeaveNotices(
  data: Pick<
    CommunityHomeData,
    "membership" | "canLeave" | "linkedTeamBlocksLeave"
  >,
) {
  const notices: string[] = [];
  if (data.linkedTeamBlocksLeave) {
    notices.push(COMMUNITY_LINKED_TEAM_BLOCKS_LEAVE_COPY);
  }
  if (
    data.membership?.role === "owner" &&
    data.canLeave === false &&
    !data.linkedTeamBlocksLeave
  ) {
    notices.push(COMMUNITY_LAST_OWNER_COPY);
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
  hasCreateAccess: boolean,
): CommunityHomeActions {
  return {
    canInvite: communityCanInvite(data),
    canCreateClubGroup: hasCreateAccess && data.canCreateClubGroup,
    canUnarchive: data.canUnarchive,
    canLeave: communityIsMember(data),
    canSoftArchive: data.canSoftArchive,
  };
}

export function communityLeaveConfirm(name: string) {
  return {
    title: `Leave ${name}?`,
    description: "You will leave this Community and its Club Groups.",
    confirmLabel: COMMUNITY_LEAVE_LABEL,
  };
}

export function communityArchiveConfirm(name: string) {
  return {
    title: `Soft-archive ${name}?`,
    description:
      "New joins, requests, and invites pause until an Owner or Admin unarchives.",
    confirmLabel: COMMUNITY_SOFT_ARCHIVE_LABEL,
  };
}

export function communityUnlinkVenueConfirm(venueName: string | null) {
  return {
    title: venueName ? `Unlink ${venueName}?` : "Unlink Venue?",
    description: "This Community will no longer be linked to that Venue.",
    confirmLabel: "Unlink Venue",
  };
}

export function venueLocation(venue: { city: string; country: string }) {
  return `${venue.city}, ${venue.country}`;
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
) {
  if (!canManage || !request) {
    return [];
  }
  const where = `${request.venue.name} (${venueLocation(request.venue)})`;
  if (request.status === "pending") {
    return [`Venue link request pending for ${where}.`];
  }
  if (request.status === "rejected" && !hasVenue) {
    return [
      `Last Venue link request for ${request.venue.name} was rejected. You may request again.`,
    ];
  }
  return [];
}

export const COMMUNITY_NO_VENUE_COPY =
  "This Community is not linked to a Venue.";

export const COMMUNITY_NO_COURTS_COPY = "No Courts.";

export function communityVenueView(
  data: CommunityHomeData,
): CommunityVenueView {
  return {
    venue: data.venue,
    location: data.venue ? venueLocation(data.venue) : null,
    courtNames: data.venue?.courts.map((court) => court.name) ?? [],
    notes: venueRequestNotes(
      data.venueLinkRequest,
      data.venue != null,
      data.canManageVenueLink,
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
): CommunityClubGroupRow {
  const name = group.name ?? "Untitled Group";
  const meta = clubGroupRowMetaLine({
    type: group.type,
    memberCount: group.memberCount,
  });
  return {
    id: group.id,
    name,
    imageUrl: group.imageUrl,
    meta,
    joined: group.isMember,
    accessibilityLabel: [name, meta, group.isMember ? "Joined" : null]
      .filter(Boolean)
      .join(", "),
  };
}

export function communityTeamRow(team: CommunityTeamData) {
  return {
    id: team.id,
    displayName: team.displayName,
    sport: groupHomeSportLabel(team.sport),
    people: team.members,
    openSeats: team.members.length < 2 ? 1 : 0,
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
) {
  const rows: CommunityMemberRow[] = members.map((member) => {
    const name = member.user.name ?? "Member";
    const isSelf = member.user.id === viewerUserId;
    return {
      id: member.id,
      userId: member.user.id,
      name,
      displayName: isSelf ? "You" : name,
      image: member.user.image,
      email: member.user.email,
      role: member.role,
      roleLabel: COMMUNITY_ROLE_LABELS[member.role],
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

export const COMMUNITY_ROLE_CHOICES = COMMUNITY_ROLES.map((role) => ({
  value: role,
  label: COMMUNITY_ROLE_LABELS[role],
}));

export function communityJoinRequestRow(
  request: CommunityJoinRequestData,
  now?: Date,
) {
  const name = request.user.name ?? "User";
  return {
    id: request.id,
    title: name,
    image: request.user.image,
    meta: requestRowMeta(request.createdAt, [], now),
  };
}

export function communityTeamLinkRequestRow(
  request: CommunityTeamLinkRequestData,
  now?: Date,
) {
  const requester = request.requestedBy.name ?? "User";
  return {
    id: request.id,
    title: request.team.displayName,
    meta: requestRowMeta(request.createdAt, [`From ${requester}`], now),
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

export function communityLiveVenueRow(venue: CommunityLiveVenueData) {
  return {
    id: venue.id,
    name: venue.name,
    location: venueLocation(venue),
    accessibilityLabel: `Request a link to ${venue.name}`,
  };
}

export const COMMUNITY_CREATE_NOT_AVAILABLE = {
  title: "Creating is limited",
  description: "New Communities, Groups, and Games are set up by Temba staff.",
};

export function communityTabLabel(tab: CommunityHomeTab, requestCount: number) {
  const label = COMMUNITY_TAB_LABELS[tab];
  return tab === "requests" && requestCount > 0
    ? `${label} (${requestCount})`
    : label;
}
