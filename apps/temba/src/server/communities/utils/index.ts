export type CommunityRole = "owner" | "admin" | "member";

export type CommunityType = "public" | "private";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export type VenueLinkStatus = "pending" | "approved" | "rejected";

export type CommunityMember = {
  id: string;
  role: CommunityRole;
  user: { id: string; name: string | null; email: string | null };
};

export type ClubGroup = {
  id: string;
  name: string | null;
  description: string | null;
  type: string | null;
  sport: string | null;
  isMember: boolean;
};

export type ClubTeam = {
  id: string;
  name: string | null;
  displayName: string;
  sport: string;
};

export type CommunityVenue = {
  id: string;
  name: string;
  city: string;
  country: string;
  logoImageUrl: string | null;
  archivedAt: Date | null;
  courts: { id: string; name: string; createdAt: Date }[];
};

export type VenueLinkRequest = {
  id: string;
  status: VenueLinkStatus;
  createdAt: Date;
  venue: { id: string; name: string; city: string; country: string };
};

export type CommunityJoinRequestSummary = {
  id: string;
  status: JoinRequestStatus;
};

export type LiveVenue = {
  id: string;
  name: string;
  city: string;
  country: string;
  logoImageUrl: string | null;
  courts: { id: string; name: string; createdAt: Date }[];
};

export type TeamLinkRequest = {
  id: string;
  createdAt: Date;
  team: { id: string; displayName: string; sport: string };
  requestedBy: { id: string; name: string; email: string };
};

export type JoinRequest = {
  id: string;
  status: JoinRequestStatus;
  createdAt: Date;
  user: { id: string; name: string; email: string };
};
