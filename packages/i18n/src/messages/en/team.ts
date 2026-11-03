import { plural } from "../../plural";

export const team = {
  title: "Teams",
  description: "Partnerships you play as",
  errorTitle: "Teams could not be loaded",
  empty: {
    title: "No Teams yet",
    description: "A Team is a lasting partnership with one other player.",
  },
  createLabel: "Create Team",
  createDescription:
    "Start an unattached Team. You become the first member and can invite others later.",
  sportLabel: "Sport",
  nameLabel: "Name (optional)",
  nameHint: "If you leave this blank, the Team home uses member names.",
  toast: {
    created: "Team created",
    joined: "Joined Team",
    left: "You left the Team",
    dissolved: "Team dissolved",
    unlinked: "Team unlinked",
    linkRequested: "Link request sent",
  },
  teamErrorTitle: "Team could not be loaded",
  notFound: {
    title: "Team not found",
    description: "It may have been dissolved, or you may not have access.",
  },
  forbidden: {
    title: "You cannot open this Team",
    description:
      "Only Team members, members of a linked Community, or a pending invitee can open a Team home.",
  },
  lookupNote: "Pick one person. Invites don't expire.",
  squadLookupNote: "Pick the people to invite. Invites don't expire.",
  squadInviteDescription:
    "Invite players to join the squad, or copy a link to share.",
  squadInviteLabel: "Invite players",
  inviteDescription:
    "Invite a partner for the open seat, or copy a link to share.",
  invitePartnerLabel: "Invite your partner",
  requestLinkLabel: "Request Community link",
  requestLinkSubmitLabel: "Request link",
  requestLinkDescription:
    "Complete Teams can request a link to a Community. Owner or Admin approve; missing members are auto-admitted.",
  leaveLabel: "Leave Team",
  unlinkLabel: "Unlink from Community",
  dissolveLabel: "Dissolve Team",
  waitingCopy:
    "Waiting for a partner. This Team is incomplete until a second member joins.",
  noMembers: {
    title: "No members",
    description: "People on this Team will show up here.",
  },
  looseLabel: "Not linked to a Community",
  clubLabel: "Club Team",
  incompleteLabel: "Incomplete",
  memberFallback: "Member",
  fallbackName: "Team",
  rowMeta: (community: string) => `Club Team · ${community}`,
  pendingLink: (community: string) => `Pending request to ${community}.`,
  dissolveConfirm: {
    title: (name: string) => `Dissolve ${name}?`,
    description: "This cannot be undone.",
  },
  leaveConfirm: {
    title: (name: string) => `Leave ${name}?`,
    description: "You can only rejoin if you are invited again.",
  },
  unlinkConfirm: {
    title: (name: string) => `Unlink ${name}?`,
    description: "This Team will no longer be linked to its Community.",
  },
  roster: {
    count: (count: number, max: number) => `${count} of ${max}`,
    full: "Full",
    complete: "Complete",
    needsForLink: (n: number) =>
      plural("en", n, {
        one: "A Team needs 1 member to request a Community link.",
        other: "A Team needs {n} members to request a Community link.",
      }),
    moreToGo: (n: number) =>
      plural("en", n, {
        one: "1 more member to go.",
        other: "{n} more members to go.",
      }),
    waitingSquad: (n: number) =>
      plural("en", n, {
        one: "Needs 1 more member to be complete.",
        other: "Needs {n} more members to be complete.",
      }),
  },
  stats: {
    gamesPlayed: "Games played",
    winRate: "Win rate",
  },
  creatorLabel: "Creator",
  noLinkableCommunity: "You're not in a Community that can link this Team.",
};
