import type {
  CommunityRoleName,
  CommunityVisibility,
} from "./community-chrome";

export type CommunityClubGroupData = {
  id: string;
  name: string | null;
  type: CommunityVisibility | null;
  imageUrl: string | null;
  memberCount: number;
  isMember: boolean;
};

export type CommunityMineRowData = {
  id: string;
  name: string;
  type: CommunityVisibility;
  role: CommunityRoleName;
  archivedAt: Date | string | null;
  memberCount: number;
  logoImageUrl: string | null;
  groups: CommunityClubGroupData[];
};

export type CommunityVenueData = {
  id: string;
  name: string;
  city: string;
  country: string;
  logoImageUrl: string | null;
  archivedAt: Date | string | null;
  courts: { id: string; name: string }[];
};

export type CommunityVenueLinkRequestData = {
  id: string;
  status: string;
  venue: { id: string; name: string; city: string; country: string };
};

export type CommunityTeamData = {
  id: string;
  displayName: string;
  sport: string | null;
  members: { name: string; image: string | null }[];
};

export type CommunityHomeData = {
  id: string;
  name: string;
  type: CommunityVisibility;
  archivedAt: Date | string | null;
  memberCount: number;
  sports: readonly string[];
  membership: { role: CommunityRoleName; userId: string } | null;
  joinRequest: { id: string; status: string } | null;
  canManageJoinRequests: boolean;
  canManageLookupInvites: boolean;
  canManageInviteLinks: boolean;
  canCreateClubGroup: boolean;
  canManageRoles: boolean;
  canSoftArchive: boolean;
  canUnarchive: boolean;
  canLeave: boolean;
  linkedTeamBlocksLeave: boolean;
  canManageTeamLinks: boolean;
  canManageVenueLink: boolean;
  canRequestVenueLink: boolean;
  canUnlinkVenue: boolean;
  venue: CommunityVenueData | null;
  venueLinkRequest: CommunityVenueLinkRequestData | null;
  groups: CommunityClubGroupData[];
  teams: CommunityTeamData[];
};

export type CommunityMemberData = {
  id: string;
  role: CommunityRoleName;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export type CommunityJoinRequestData = {
  id: string;
  createdAt: Date | string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export type CommunityTeamLinkRequestData = {
  id: string;
  createdAt: Date | string;
  team: { id: string; displayName: string };
  requestedBy: { name: string | null };
};

export type CommunityLiveVenueData = {
  id: string;
  name: string;
  city: string;
  country: string;
};
