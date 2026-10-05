import type {
  CommunityHomeData,
  CommunityJoinRequestData,
  CommunityLiveVenueData,
  CommunityMemberData,
  CommunityMineRowData,
  CommunityTeamLinkRequestData,
} from "./community-data";

const DAY_MS = 24 * 60 * 60 * 1000;

export type CommunityHomeFixtureKey =
  | "owner"
  | "admin"
  | "member"
  | "lastOwner"
  | "linkedTeam"
  | "noVenue"
  | "venueRequestPending"
  | "venueRequestRejected"
  | "publicVisitor"
  | "requestPending"
  | "requestRejected"
  | "privateVisitor"
  | "archivedMember"
  | "archivedOwner"
  | "archivedVisitor"
  | "empty";

const CLUB_GROUPS: CommunityHomeData["groups"] = [
  {
    id: "group-bromma",
    name: "Bromma Padel Club",
    type: "public",
    imageUrl: null,
    memberCount: 14,
    isMember: true,
  },
  {
    id: "group-ladder",
    name: "Tuesday Ladder",
    type: "private",
    imageUrl: null,
    memberCount: 6,
    isMember: false,
  },
  {
    id: "group-unnamed",
    name: null,
    type: null,
    imageUrl: null,
    memberCount: 1,
    isMember: false,
  },
];

const TEAMS: CommunityHomeData["teams"] = [
  {
    id: "team-ada-kim",
    displayName: "Ada Lindqvist & Kim Holm",
    sport: "padel",
    members: [
      { name: "Ada Lindqvist", image: null },
      { name: "Kim Holm", image: null },
    ],
  },
  {
    id: "team-elin",
    displayName: "Elin Nilsson",
    sport: "padel",
    members: [{ name: "Elin Nilsson", image: null }],
  },
];

const VENUE: NonNullable<CommunityHomeData["venue"]> = {
  id: "venue-bromma",
  name: "Bromma Padel Center",
  city: "Stockholm",
  country: "Sweden",
  logoImageUrl: null,
  archivedAt: null,
  courts: [
    { id: "court-1", name: "Court 1" },
    { id: "court-2", name: "Court 2" },
    { id: "court-3", name: "Court 3" },
  ],
};

const VIEWER_ID = "viewer";

const BASE: CommunityHomeData = {
  id: "community-bromma",
  name: "Bromma Padel Community",
  type: "public",
  archivedAt: null,
  memberCount: 38,
  sports: ["padel"],
  membership: { role: "member", userId: VIEWER_ID },
  joinRequest: null,
  canManageJoinRequests: false,
  canManageLookupInvites: false,
  canManageInviteLinks: false,
  canCreateClubGroup: false,
  canManageRoles: false,
  canSoftArchive: false,
  canUnarchive: false,
  canLeave: true,
  linkedTeamBlocksLeave: false,
  canManageTeamLinks: false,
  canManageVenueLink: false,
  canRequestVenueLink: false,
  canUnlinkVenue: false,
  venue: VENUE,
  venueLinkRequest: null,
  groups: CLUB_GROUPS,
  teams: TEAMS,
};

const STAFF: Partial<CommunityHomeData> = {
  canManageJoinRequests: true,
  canManageLookupInvites: true,
  canManageInviteLinks: true,
  canCreateClubGroup: true,
  canSoftArchive: true,
  canManageTeamLinks: true,
  canManageVenueLink: true,
  canUnlinkVenue: true,
};

const NON_MEMBER: Partial<CommunityHomeData> = {
  membership: null,
  canLeave: false,
  venue: null,
  teams: [],
};

function home(extra: Partial<CommunityHomeData>): CommunityHomeData {
  return { ...BASE, ...extra };
}

export function createCommunityFixtures(now: Date = new Date()) {
  const archivedAt = new Date(now.getTime() - 10 * DAY_MS);
  const owner = home({
    ...STAFF,
    membership: { role: "owner", userId: VIEWER_ID },
    canManageRoles: true,
  });

  const mine: CommunityMineRowData[] = [
    {
      id: "community-bromma",
      name: "Bromma Padel Community",
      type: "public",
      role: "owner",
      archivedAt: null,
      memberCount: 38,
      logoImageUrl: null,
      groups: CLUB_GROUPS,
    },
    {
      id: "community-solna",
      name: "Solna Racket Society",
      type: "private",
      role: "member",
      archivedAt: null,
      memberCount: 1,
      logoImageUrl: null,
      groups: [],
    },
    {
      id: "community-old",
      name: "Old Town Padel",
      type: "public",
      role: "admin",
      archivedAt,
      memberCount: 9,
      logoImageUrl: null,
      groups: [CLUB_GROUPS[0]!],
    },
  ];

  const homes: Record<CommunityHomeFixtureKey, CommunityHomeData> = {
    owner,
    admin: home({
      ...STAFF,
      membership: { role: "admin", userId: VIEWER_ID },
      canUnlinkVenue: true,
    }),
    member: home({}),
    lastOwner: { ...owner, canLeave: false },
    linkedTeam: { ...owner, canLeave: false, linkedTeamBlocksLeave: true },
    noVenue: {
      ...owner,
      venue: null,
      canUnlinkVenue: false,
      canRequestVenueLink: true,
    },
    venueRequestPending: {
      ...owner,
      venue: null,
      canUnlinkVenue: false,
      canRequestVenueLink: false,
      venueLinkRequest: {
        id: "request-pending",
        status: "pending",
        venue: {
          id: "venue-solna",
          name: "Solna Padel Hall",
          city: "Solna",
          country: "Sweden",
        },
      },
    },
    venueRequestRejected: {
      ...owner,
      venue: null,
      canUnlinkVenue: false,
      canRequestVenueLink: true,
      venueLinkRequest: {
        id: "request-rejected",
        status: "rejected",
        venue: {
          id: "venue-solna",
          name: "Solna Padel Hall",
          city: "Solna",
          country: "Sweden",
        },
      },
    },
    publicVisitor: home(NON_MEMBER),
    requestPending: home({
      ...NON_MEMBER,
      joinRequest: { id: "join-1", status: "pending" },
    }),
    requestRejected: home({
      ...NON_MEMBER,
      joinRequest: { id: "join-2", status: "rejected" },
    }),
    privateVisitor: home({ ...NON_MEMBER, type: "private" }),
    archivedMember: home({ archivedAt }),
    archivedOwner: {
      ...owner,
      archivedAt,
      canManageJoinRequests: false,
      canManageLookupInvites: false,
      canManageInviteLinks: false,
      canCreateClubGroup: false,
      canSoftArchive: false,
      canManageTeamLinks: false,
      canManageVenueLink: false,
      canUnlinkVenue: false,
      canUnarchive: true,
    },
    archivedVisitor: home({ ...NON_MEMBER, archivedAt }),
    empty: { ...owner, groups: [], teams: [], memberCount: 1 },
  };

  const members: CommunityMemberData[] = [
    {
      id: "member-viewer",
      role: "owner",
      user: {
        id: VIEWER_ID,
        name: "Alex Rivera",
        email: "alex@example.com",
        image: null,
      },
    },
    {
      id: "member-ada",
      role: "admin",
      user: {
        id: "ada",
        name: "Ada Lindqvist",
        email: "ada@example.com",
        image: null,
      },
    },
    {
      id: "member-kim",
      role: "member",
      user: { id: "kim", name: "Kim Holm", email: null, image: null },
    },
    {
      id: "member-anon",
      role: "member",
      user: { id: "anon", name: null, email: null, image: null },
    },
  ];

  const joinRequests: CommunityJoinRequestData[] = [
    {
      id: "join-request-1",
      createdAt: new Date(now.getTime() - 3 * DAY_MS),
      user: { id: "elin", name: "Elin Nilsson", email: null, image: null },
    },
    {
      id: "join-request-2",
      createdAt: now,
      user: { id: "sam", name: null, email: null, image: null },
    },
  ];

  const teamLinkRequests: CommunityTeamLinkRequestData[] = [
    {
      id: "team-link-1",
      createdAt: new Date(now.getTime() - DAY_MS),
      team: { id: "team-ada-kim", displayName: "Ada Lindqvist & Kim Holm" },
      requestedBy: { name: "Ada Lindqvist" },
    },
  ];

  const liveVenues: CommunityLiveVenueData[] = [
    {
      id: "venue-solna",
      name: "Solna Padel Hall",
      city: "Solna",
      country: "Sweden",
    },
    {
      id: "venue-kista",
      name: "Kista Padel",
      city: "Kista",
      country: "Sweden",
    },
  ];

  return {
    mine,
    home: homes,
    members,
    joinRequests,
    teamLinkRequests,
    liveVenues,
  };
}
