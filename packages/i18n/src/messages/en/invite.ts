import { plural } from "../../plural";

export const invite = {
  kind: {
    group: "Group",
    team: "Team",
    game: "Game",
  },
  door: {
    mode: {
      players: "Players",
      phone: "Phone",
      link: "Link",
    },
    invitePlayers: "Invite players",
    resultsHeading: "Results",
    suggestedHeading: "Suggested",
    noMatch: (query: string) => `No one on Temba matches "${query}".`,
    noMatchTryOtherWays: (query: string) =>
      `No one on Temba matches "${query}".\nTry their phone number or send them the link.`,
    inviteButton: "Invite",
    invitedButton: "Invited",
    invitedA11y: "invited",
    phone: {
      sending: "Sending…",
      send: "Send invite by text",
      enterNumber: "Enter a number",
      note: "They get a text with your invite.",
      noteWithLookup:
        "They get a text with your invite. If they are already on Temba it lands in their app too.",
    },
    linkLifetime: {
      game: "Works until the Game ends or registration closes.",
      other: "Each link works for 6 hours.",
    },
    linkEmptyNote: "A new link is made when you share it.",
    linkNote: {
      game: "Anyone with the link can take a seat. Good for WhatsApp groups.",
      group:
        "Anyone with the link can join the Group. Good for WhatsApp groups.",
      team: "Send it to the partner you want on your Team.",
    },
    pendingHeading: (n: number) => `Pending, ${n}`,
    pendingNote: "Waiting for an answer",
    noPending: "No invites sent yet.",
  },
  outcome: {
    invalid: {
      title: "Link expired or invalid",
      description: "Ask the person who shared it for a new invite link.",
    },
    unavailable: {
      playersTitle: "Not accepting new players",
      membersTitle: "Not accepting new members",
      description: {
        group: "This Group isn't accepting new members right now.",
        team: "This Team isn't accepting new members right now.",
        game: "This Game isn't accepting new players right now.",
      },
    },
    waitingForPartner: {
      title: "Waiting for your partner",
      description:
        "Your Team is registered once both partners accept. Until then you don't hold a seat or a waitlist spot.",
    },
  },
  inbox: {
    rowMeta: {
      group: (inviter: string) => `Group invite from ${inviter}`,
      team: (inviter: string) => `Team invite from ${inviter}`,
      game: (inviter: string) => `Game invite from ${inviter}`,
    },
    empty: {
      title: "Nothing waiting",
      description:
        "Invites to Games, Groups and Teams show up here.",
    },
    errorTitle: "Invites could not be loaded",
    acceptLabel: "Accept",
    sitHereLabel: "Sit here",
    joinWaitlistLabel: "Join waitlist",
    linkCopiedToast: "Invite link copied",
    linkCopyFailedToast: "Couldn't copy the link",
    lookupRevokedToast: "Lookup invite revoked",
    groupLookupNote:
      "You and the Group's Organizers can invite people here. Invites don't expire.",
    seatCopy: {
      frozen:
        "Occupied seats show who is already registered. This Game is not open for registration.",
      signedOut:
        "Occupied seats show who is already registered. Sign in or create an account to pick a vacant Position.",
      waitlistLink:
        "No vacant Position. Occupied seats show who is already registered. Accept to join the waitlist.",
      waitlistInbox:
        "No vacant Position. Occupied seats show who is already registered.",
      pick: "Occupied seats show who is already registered. Pick a vacant Position to sit.",
    },
    joinedToast: {
      group: "Joined Group",
      team: "Joined Team",
    },
    lookupSent: (n: number) =>
      plural("en", n, {
        one: "Lookup invite sent",
        other: "{n} Lookup invites sent",
      }),
  },
  link: {
    joinLabel: (name: string) => `Join ${name}`,
    requestJoinLabel: (name: string) => `Request to join ${name}`,
    waitingForPartnerToast: "Waiting for your Team partner to accept",
    alreadyOnGameToast: "Already on this Game",
    joinedGameAndGroupToast: "Joined Game and its Group",
    joinedWaitlistAndGroupToast: "Joined waitlist and the Group",
    levelRangePendingNote: "Request pending. Organizers have not decided yet.",
    requesting: "Requesting…",
    requestAgain: "Request again",
    requestToPlay: "Request to play",
  },
  groupShare: {
    fallbackName: "Group",
    invitationLine: (name: string) => `You are invited to join "${name}"`,
    invitationLineSport: (name: string, sport: string) =>
      `You are invited to join "${name}" for "${sport}"`,
    joinLine: (url: string) => `Join: ${url}`,
  },
};
