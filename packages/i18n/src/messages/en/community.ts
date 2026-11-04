import { plural } from "../../plural";

export const community = {
  title: "Communities",
  fallbackName: "Community",
  errorTitle: "Communities could not be loaded",
  communityErrorTitle: "Community could not be loaded",
  notFound: {
    title: "Community not found",
    description: "It may have been removed, or you may not have access.",
  },
  start: {
    title: "Start a Community",
    description: "Communities organise Club Groups around a Venue.",
    action: "Create Community",
  },
  noGroups: "No Groups yet",
  create: {
    title: "Create Community",
    description: "You become the Owner. Groups are optional.",
    publicHelp:
      "People with the Community link ask to join. It isn't listed anywhere yet.",
    privateHelp: "Only people you invite can join.",
    submit: "Create Community",
    notAvailable: {
      title: "Creating is limited",
      description: "New Communities are set up by Temba staff.",
    },
  },
  type: {
    public: "Public",
    private: "Private",
  },
  role: {
    owner: "Owner",
    admin: "Admin",
    member: "Member",
  },
  tab: {
    groups: "Groups",
    teams: "Teams",
    members: "Members",
    requests: "Requests",
    withCount: (label: string, n: number) => `${label} (${n})`,
  },
  toast: {
    created: "Community created",
    joinRequested: "Join request sent",
    requestApproved: "Request approved",
    requestRejected: "Request rejected",
    teamLinked: "Team linked",
    teamLinkRejected: "Link request rejected",
    venueLinkRequested: "Venue link requested",
    venueUnlinked: "Venue unlinked",
    left: "Left Community and its Club Groups",
    archived: "Community Soft-archived",
    unarchived: "Community unarchived",
    clubGroupCreated: "Club Group created",
    roleUpdated: (role: string) => `Role updated to ${role}`,
  },
  action: {
    requestJoin: "Request to join",
    createClubGroup: "Create Club Group",
    manageInvites: "Manage invites",
    unarchive: "Unarchive",
    leave: "Leave Community",
    softArchive: "Soft-archive",
    linkVenue: "Link a Venue",
    unlinkVenue: "Unlink Venue",
  },
  startClubGroup: {
    title: "Start a Club Group",
    description: "Club Groups stay inside this Community.",
  },
  createClubGroupDescription: "A Group inside this Community.",
  noGroupsEmpty: {
    title: "No Groups yet",
    description: "This Community has no Groups yet.",
  },
  noTeamsEmpty: {
    title: "No linked Teams",
    description: "This Community has no linked Teams yet.",
  },
  noMembersEmpty: {
    title: "No members yet",
    description: "People who join this Community will show up here.",
  },
  membersNoMatch: "No members match that name.",
  inviteBlock: {
    title: "Invite players",
    description: "Invite players to this Community and its Club Groups.",
    action: "Share invite link",
  },
  lookupNote: "Owners and Admins can invite people. Invites don't expire.",
  requestsEmpty: {
    title: "No pending requests",
    description:
      "Community join requests and Team link requests will show up here.",
  },
  joinRequestsTitle: "Join requests",
  joinRequestsErrorTitle: "Join requests could not be loaded",
  teamLinkRequestsTitle: "Team link requests",
  teamLinkRequestsErrorTitle: "Team link requests could not be loaded",
  membersErrorTitle: "Members could not be loaded",
  linkVenue: {
    title: "Link a Venue",
    description: "Search live Venues by name, city, or country.",
    searchLabel: "Search Venues",
    none: "No live Venues match.",
    errorTitle: "Venues could not be loaded",
    requestLabel: "Request link",
    requestLinkTo: (venue: string) => `Request a link to ${venue}`,
  },
  badge: {
    softArchived: "Soft-archived",
    joinPending: "Join request pending",
    joinRejected: "Join request rejected",
  },
  archiveBanner: {
    member: {
      heading: "Soft-archived",
      body: "Club Groups stay attached. You can still open Groups and see history and Games. New joins, requests, Lookup invites, and Invite links are paused until an Owner or Admin unarchives.",
    },
    visitor: {
      heading: "This Community is Soft-archived",
      body: "It is not open for new joins, requests, or invites. Members can still open history and Games. This is not a missing page.",
    },
  },
  linkedTeamBlocksLeave:
    "Leave is refused while you sit on a Team linked to this Community. Unlink or dissolve the Team first.",
  lastOwner:
    "You are the last Owner. Promote someone else before leaving or demoting yourself. Leaving does not Soft-archive this Community.",
  leaveConfirm: {
    title: (name: string) => `Leave ${name}?`,
    description: "You will leave this Community and its Club Groups.",
  },
  archiveConfirm: {
    title: (name: string) => `Soft-archive ${name}?`,
    description:
      "New joins, requests, and invites pause until an Owner or Admin unarchives.",
  },
  unlinkVenueConfirm: {
    title: (venue: string) => `Unlink ${venue}?`,
    titleGeneric: "Unlink Venue?",
    description: "This Community will no longer be linked to that Venue.",
  },
  venue: {
    location: (city: string, country: string) => `${city}, ${country}`,
    requestPending: (where: string) =>
      `Venue link request pending for ${where}.`,
    requestRejected: (venue: string) =>
      `Last Venue link request for ${venue} was rejected. You may request again.`,
    noVenue: "This Community is not linked to a Venue.",
    noCourts: "No Courts.",
    count: (n: number) =>
      plural("en", n, { one: "1 venue", other: "{n} venues" }),
  },
  joined: "Joined",
  memberFallback: "Member",
  userFallback: "User",
  from: (name: string) => `From ${name}`,
  meta: {
    youAreRole: (role: string) => `you are ${role}`,
    twoSports: (first: string, second: string) => `${first} and ${second}`,
  },
  roleChange: {
    selfTitle: (role: string) => `Change your role to ${role}?`,
    selfDescription:
      "You will no longer be able to change Community roles. Only another Owner can make you an Owner again.",
    becomeRole: (role: string) => `Become ${role}`,
    makeOwnerTitle: (name: string) => `Make ${name} an Owner?`,
    makeOwnerDescription:
      "Owners can change every member's role, including yours.",
    makeOwnerLabel: "Make Owner",
  },
  sports: {
    title: "Sports",
    description:
      "Club Groups and Teams in this Community can use these sports.",
    addedToast: "Sport added",
    removedToast: "Sport removed",
    createLabel: "Sports",
    createHelp: "Pick at least one.",
  },
};
