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
    description: "Only Team members or a pending invitee can open a Team home.",
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
    title: "Roster",
    count: (count: number, max: number) => `${count} of ${max}`,
    hero: (count: number, max: number) => `Roster ${count} of ${max}`,
    plays: (sideSizes: readonly number[]) => {
      const sizes = sideSizes.map(String);
      const last = sizes.pop();
      const list = sizes.length > 0 ? `${sizes.join(", ")} and ${last}` : last;
      return `Plays ${list}-a-side`;
    },
    more: (n: number) =>
      plural("en", n, { one: "and 1 more", other: "and {n} more" }),
    addMore: {
      title: "Add more",
      detail: (max: number) => `By phone or on Temba. Up to ${max}`,
      detailWithGroup: (group: string, max: number) =>
        `By phone, on Temba, or from ${group}. Up to ${max}`,
    },
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
    draws: "Draws",
  },
  captainLabel: "Captain",
  sportChoice: {
    padel: { name: "Padel", detail: "2 players" },
    football: {
      name: "Football",
      detail: (max: number) => `Roster up to ${max}`,
    },
  },
  rosterHelper: (max: number) =>
    `5 needed for 5-a-side, 7 for 7-a-side, ${max} max`,
  draft: {
    countLine: (count: number, max: number) =>
      `${count} of ${max}, you included`,
    invited: "Invited, waiting",
    added: "Added, not on Temba",
    remove: (name: string) => `Remove ${name}`,
    footer:
      "Six is enough to post a 6-a-side challenge; the matchday squad is named per game, after it's confirmed.",
    full: (max: number) => `The Roster is full at ${max}.`,
  },
  addPlayers: {
    title: "Add players",
    description:
      "Add by phone, find someone on Temba, or pick from a Group you organize. People on Temba get an invite to accept.",
    tabs: {
      label: "How to add",
      phone: "By phone",
      temba: "On Temba",
      group: "From a group",
    },
    spotsLeft: (n: number) =>
      plural("en", n, { one: "1 spot left", other: "{n} spots left" }),
    full: "The Roster is full.",
    addToRoster: "Add to roster",
    searchLabel: "Search by name, username, email or phone",
    searchEmpty: "No one on Temba matches.",
    invite: "Invite",
    invitedMark: "Invited",
    preview: {
      alreadyOnTeam: (name: string) => `${name} is already on the Roster`,
      alreadyInvited: (name: string) => `${name} already has an invite`,
      alreadyListed: (name: string) => `${name} is already on the list`,
    },
    groupLabel: "Group",
    noGroups: "Groups you organize show here.",
    groupEmpty: "Everyone in this Group is already on the Roster.",
    memberUnclaimed: "Not on Temba yet. Add them by phone.",
    addCount: (n: number) =>
      plural("en", n, { one: "Add 1 player", other: "Add {n} players" }),
    select: "Select players",
    invitesSent: (n: number) =>
      plural("en", n, { one: "1 invite sent", other: "{n} invites sent" }),
    listed: (name: string) => `${name} is on the list`,
    listedCount: (n: number) =>
      plural("en", n, {
        one: "1 player on the list",
        other: "{n} players on the list",
      }),
    removeConfirm: {
      title: (name: string) => `Remove ${name}?`,
      description:
        "They are not on Temba yet, so they come off the Roster. Their Games stay in history.",
      confirm: "Remove",
    },
  },
  groupTag: {
    line: (group: string) => `${group}'s team`,
    tagAs: (group: string) => `Tag as ${group}'s team`,
    remove: "Remove tag",
    tagged: (group: string) => `Tagged as ${group}'s team`,
    removed: "Tag removed",
    createNote: (group: string) =>
      `This Team will be tagged as ${group}'s team.`,
  },
  recordSpoken: (wins: number, losses: number) => `Won ${wins}, lost ${losses}`,
  recordSpokenWithDraws: (wins: number, draws: number, losses: number) =>
    `Won ${wins}, drew ${draws}, lost ${losses}`,
  onRoster: (n: number) =>
    plural("en", n, { one: "1 on the roster", other: "{n} on the roster" }),
  level: {
    member: (band: string, level: string) => `${band}, ${level}`,
    team: (band: string, level: string) => `${band}, avg ${level}`,
  },
  seat: {
    left: "Plays left",
    right: "Plays right",
    either: "Either side",
    keeper: "Keeper",
    outfield: "Outfield",
  },
  form: {
    title: "Form",
    empty: "No results yet. The last ten show here.",
    older: "Older",
    latest: "Latest",
  },
  rivals: {
    title: "Rivals",
    headToHead: (wins: number, losses: number) => `${wins}–${losses}`,
    headToHeadWithDraws: (wins: number, draws: number, losses: number) =>
      `${wins}–${draws}–${losses}`,
    headToHeadSpoken: (wins: number, losses: number) =>
      `Head-to-head: won ${wins}, lost ${losses}`,
    headToHeadSpokenWithDraws: (wins: number, draws: number, losses: number) =>
      `Head-to-head: won ${wins}, drew ${draws}, lost ${losses}`,
    played: (n: number) =>
      plural("en", n, {
        one: "1 Match",
        other: "{n} Matches",
      }),
    last: (result: string, day: string) => `Last: ${result}, ${day}`,
    closest: (name: string) =>
      `Closest: ${name}, played once. One more Match makes them a Rival.`,
    empty: "Play the same Team twice and they become a Rival.",
    rematch: "Rematch",
    rematchA11y: (team: string) => `Rematch ${team}`,
    opponentFallback: "Opponent",
  },
  games: {
    title: "Games",
    empty: "No games played yet.",
  },
};
