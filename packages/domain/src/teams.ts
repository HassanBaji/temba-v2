import { groupHomeSportLabel } from "./group-home-chrome";
import { teamAvatarPeople } from "./team-avatar-people";
import { formatWinRate } from "./win-rate";

export const TEAMS_TITLE = "Teams";
export const TEAMS_DESCRIPTION = "Partnerships you play as";
export const TEAMS_ERROR_TITLE = "Teams could not be loaded";
export const TEAMS_EMPTY_COPY = {
  title: "No Teams yet",
  description: "A Team is a lasting partnership with one other player.",
};
export const TEAM_CREATE_LABEL = "Create Team";
export const TEAM_CREATE_DESCRIPTION =
  "Start an unattached padel partnership. You become the first member and can invite a partner later.";
export const TEAM_NAME_LABEL = "Name (optional)";
export const TEAM_NAME_HINT =
  "If you leave this blank, the Team home uses member names.";
export const TEAM_CREATED_TOAST = "Team created";
export const TEAM_JOINED_TOAST = "Joined Team";
export const TEAM_DISSOLVED_TOAST = "Team dissolved";
export const TEAM_UNLINKED_TOAST = "Team unlinked";
export const TEAM_LINK_REQUESTED_TOAST = "Link request sent";
export const TEAM_ERROR_TITLE = "Team could not be loaded";
export const TEAM_NOT_FOUND_COPY = {
  title: "Team not found",
  description: "It may have been dissolved, or you may not have access.",
};
export const TEAM_FORBIDDEN_COPY = {
  title: "You cannot open this Team",
  description:
    "Only Team members, members of a linked Community, or a pending invitee can open a Team home.",
};
export const TEAM_LOOKUP_NOTE = "Pick one person. Invites don't expire.";
export const TEAM_INVITE_DESCRIPTION =
  "Invite a partner for the open seat, or copy a link to share.";
export const TEAM_INVITE_PARTNER_LABEL = "Invite your partner";
export const TEAM_REQUEST_LINK_LABEL = "Request Community link";
export const TEAM_REQUEST_LINK_SUBMIT_LABEL = "Request link";
export const TEAM_REQUEST_LINK_DESCRIPTION =
  "Full Teams can request a link to a Community. Owner or Admin approve; missing members are auto-admitted.";
export const TEAM_UNLINK_LABEL = "Unlink from Community";
export const TEAM_DISSOLVE_LABEL = "Dissolve Team";
export const TEAM_WAITING_COPY =
  "Waiting for a partner. This Team is incomplete until a second member joins.";
export const TEAM_NO_MEMBERS_COPY = {
  title: "No members",
  description: "People on this Team will show up here.",
};
export const TEAM_LOOSE_LABEL = "Not linked to a Community";
export const TEAM_CLUB_LABEL = "Club Team";
export const TEAM_INCOMPLETE_LABEL = "Incomplete";
export const TEAM_MEMBER_FALLBACK_NAME = "Member";

export function teamNameInput(name: string) {
  const trimmed = name.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function teamRowMeta(community: { name: string } | null) {
  return community
    ? `${TEAM_CLUB_LABEL} · ${community.name}`
    : TEAM_LOOSE_LABEL;
}

export type TeamListRowInput = {
  id: string;
  displayName: string;
  community: { name: string } | null;
  incomplete: boolean;
  members: { name: string; image?: string | null }[];
};

export function teamListRowView(team: TeamListRowInput) {
  const meta = teamRowMeta(team.community);
  return {
    id: team.id,
    title: team.displayName,
    meta,
    people: teamAvatarPeople(team.members),
    openSeats: team.incomplete ? 1 : 0,
    incompleteLabel: team.incomplete ? TEAM_INCOMPLETE_LABEL : null,
    accessibilityLabel: [
      team.displayName,
      meta,
      team.incomplete ? TEAM_INCOMPLETE_LABEL : null,
    ]
      .filter(Boolean)
      .join(", "),
  };
}

export function teamPendingLinkCopy(communityName: string) {
  return `Pending request to ${communityName}.`;
}

export function teamDissolveConfirm(displayName: string) {
  return {
    title: `Dissolve ${displayName}?`,
    description: "This cannot be undone.",
    confirmLabel: TEAM_DISSOLVE_LABEL,
  };
}

export function teamUnlinkConfirm(displayName: string) {
  return {
    title: `Unlink ${displayName}?`,
    description: "This Team will no longer be linked to its Community.",
    confirmLabel: TEAM_UNLINK_LABEL,
  };
}

export type TeamHomeInput = {
  displayName: string | null;
  sport: string;
  isLoose: boolean;
  waitingForPartner: boolean;
  gamesPlayed: number;
  wins: number;
  losses: number;
  community: { id: string; name: string } | null;
  pendingLinkRequest: { community: { name: string } } | null;
  members: {
    id: string;
    name: string | null;
    image: string | null;
    isCreator: boolean;
    isViewer: boolean;
  }[];
  canInvite: boolean;
  canRequestLink: boolean;
  canUnlink: boolean;
  canDissolve: boolean;
};

export function teamHomeView(data: TeamHomeInput) {
  const title = data.displayName ?? "Team";
  const badges = [
    groupHomeSportLabel(data.sport),
    data.isLoose ? TEAM_LOOSE_LABEL : TEAM_CLUB_LABEL,
    data.waitingForPartner ? TEAM_INCOMPLETE_LABEL : null,
  ].filter((badge): badge is string => badge != null);

  return {
    title,
    badges,
    people: data.members.map((member) => ({
      name: member.name ?? TEAM_MEMBER_FALLBACK_NAME,
      image: member.image,
    })),
    openSeats: data.waitingForPartner ? 1 : 0,
    linkedCommunity: data.community,
    primaryInvite: data.waitingForPartner && data.canInvite,
    waitingNote: data.waitingForPartner && !data.canInvite,
    pendingLinkNote: data.pendingLinkRequest
      ? teamPendingLinkCopy(data.pendingLinkRequest.community.name)
      : null,
    stats: [
      { label: "Games played", value: String(data.gamesPlayed) },
      { label: "Wins", value: String(data.wins) },
      { label: "Losses", value: String(data.losses) },
      { label: "Win rate", value: formatWinRate(data.wins, data.gamesPlayed) },
    ],
    members: data.members.map((member) => ({
      id: member.id,
      name: member.name ?? TEAM_MEMBER_FALLBACK_NAME,
      image: member.image,
      isViewer: member.isViewer,
      creatorLabel: member.isCreator ? "Creator" : null,
    })),
    canInvite: data.canInvite,
    canRequestLink: data.canRequestLink,
    canUnlink: data.canUnlink,
    canDissolve: data.canDissolve,
  };
}

export type TeamHomeView = ReturnType<typeof teamHomeView>;
