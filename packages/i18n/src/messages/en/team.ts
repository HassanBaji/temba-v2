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
    "Start a Team. You become the first member and can invite others later.",
  sportLabel: "Sport",
  nameLabel: "Name (optional)",
  nameHint: "If you leave this blank, the Team home uses member names.",
  toast: {
    created: "Team created",
    joined: "Joined Team",
    left: "You left the Team",
    dissolved: "Team dissolved",
  },
  teamErrorTitle: "Team could not be loaded",
  notFound: {
    title: "Team not found",
    description: "It may have been dissolved, or you may not have access.",
  },
  forbidden: {
    title: "You cannot open this Team",
    description:
      "Only Team members or a pending invitee can open a Team home.",
  },
  lookupNote: "Pick one person. Invites don't expire.",
  squadLookupNote: "Pick the people to invite. Invites don't expire.",
  squadInviteDescription:
    "Invite players to join the squad, or copy a link to share.",
  squadInviteLabel: "Invite players",
  inviteDescription:
    "Invite a partner for the open seat, or copy a link to share.",
  invitePartnerLabel: "Invite your partner",
  leaveLabel: "Leave Team",
  dissolveLabel: "Dissolve Team",
  waitingCopy:
    "Waiting for a partner. This Team is incomplete until a second member joins.",
  noMembers: {
    title: "No members",
    description: "People on this Team will show up here.",
  },
  incompleteLabel: "Incomplete",
  memberFallback: "Member",
  fallbackName: "Team",
  dissolveConfirm: {
    title: (name: string) => `Dissolve ${name}?`,
    description: "This cannot be undone.",
  },
  leaveConfirm: {
    title: (name: string) => `Leave ${name}?`,
    description: "You can only rejoin if you are invited again.",
  },
  roster: {
    count: (count: number, max: number) => `${count} of ${max}`,
    full: "Full",
    complete: "Complete",
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
};
