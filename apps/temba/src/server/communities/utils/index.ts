export type CommunityRole = "owner" | "admin" | "member";

export type JoinRequestStatus = "pending" | "approved" | "rejected";

export type VenueLinkStatus = "pending" | "approved" | "rejected";

export type CommunityMember = {
  id: string;
  role: CommunityRole;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
};

export type VenueLinkRequest = {
  id: string;
  status: VenueLinkStatus;
  createdAt: Date;
  venue: { id: string; name: string; city: string; country: string };
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
  user: { id: string; name: string; email: string; image: string | null };
};
