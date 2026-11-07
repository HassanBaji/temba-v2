import { plural } from "../../plural";

export const mobileInvite = {
  share: {
    venueFallback: "Venue",
  },
  subtitle: {
    when: (day: string, time: string) => `${day} ${time}`,
    separator: ", ",
    sentence: (place: string) => `${place}.`,
    seatsOpen: (n: number) =>
      plural("en", n, { one: "1 seat open.", other: "{n} seats open." }),
  },
  sheet: {
    searchPlaceholder: "Name or phone number",
    searchA11y: "Search players",
    inviteA11y: (name: string) => `Invite ${name}`,
    cancelInviteA11y: (name: string) => `Cancel invite for ${name}`,
    refusedLine: (name: string, message: string) => `${name}: ${message}`,
    phoneLabel: "Phone number",
    copyLinkA11y: "Copy link",
    shareLink: "Share link",
    whatsApp: "WhatsApp",
    messages: "Messages",
  },
  link: {
    title: "Invite",
    incompleteTitle: "Couldn't open this invite",
    incompleteDescription:
      "The link is incomplete. Go back and paste it again.",
    loadingA11y: "Loading invite",
    loadErrorTitle: "Couldn't load this invite",
    loadErrorDescription: "Check your connection and try again.",
    chooseHowYouPlay: "Choose how you play",
    teamsSet: "Set",
    teamsByOrganizer: "Made by the organizer",
    fromALink: "From a link",
    group: {
      sharedBy: (name: string) => `Shared by ${name}.`,
      notInYet: (group: string) => `You're not in ${group} yet.`,
      landingNote: (group: string) =>
        `Games live inside groups. You can take this seat, or just join ${group} and pick a game later.`,
      joinGroup: "Join group",
      joinGame: "Join game",
      seatsOpen: (n: number) =>
        plural("en", n, { one: "1 seat open", other: "{n} seats open" }),
      asksFirst: "Join asks about the group first",
      oneTap: "You're a member, so this is one tap",
      groupRow: "Group",
      groupMeta: (sport: string | null, members: string) =>
        sport ? `${sport}, ${members}` : members,
      members: (n: number) =>
        plural("en", n, { one: "1 member", other: "{n} members" }),
      memberNames: (names: string[], others: number) => {
        const list = names.join(", ");
        if (others <= 0) {
          return list;
        }
        return plural("en", others, {
          one: `${list} and 1 other`,
          other: `${list} and {n} others`,
        });
      },
      sheetTitle: "You're not in this group yet",
      openLead: (group: string) =>
        `${group} lets anyone with the link in. Pick how far you want to go.`,
      approvalLead: (group: string, sharer: string | null) =>
        sharer
          ? `${group}'s organizers approve new members. ${sharer} shared the game, so the seat can be held while they decide.`
          : `${group}'s organizers approve new members. The seat can be held while they decide.`,
      joinBoth: {
        title: "Join the group and take the seat",
        description: (group: string) =>
          `You're in this game and in ${group} for the next ones.`,
      },
      joinGroupOnly: {
        title: "Join the group only",
        description:
          "See their games and join one when it suits you. This seat stays open.",
      },
      requestBoth: {
        title: "Request to join and hold the seat",
        description: (hours: number) =>
          `Seat held ${hours} hours. If they approve, you're in the game and the group.`,
      },
      requestGroupOnly: {
        title: "Request to join the group only",
        description: "No seat held. You can join a game once you're approved.",
      },
      justLooking: "Just looking for now",
      approvalNote: (sharer: string | null) =>
        sharer
          ? `Organizers see your name, level and that ${sharer} shared the link with you. Most answer within the day.`
          : "Organizers see your name and level. Most answer within the day.",
      joinedToast: (group: string) => `Joined ${group}`,
      joinedTitle: (group: string) => `You're in ${group}`,
      joinedDescription: (seats: string | null) =>
        seats
          ? `Their games now show in your Games tab. This one still has ${seats}.`
          : "Their games now show in your Games tab.",
      openGroup: "Open group",
      requestedToast: "Request sent",
      requestSentTitle: (group: string) => `Request sent to ${group}`,
      seatHeldUntil: (when: string) =>
        `Seat held until ${when}. You'll hear as soon as an organizer answers.`,
      noSeatHeld: "No seat held. You can join a game once you're approved.",
      sharedByLabel: "Shared by",
      sharedByOrganizer: (name: string) => `${name}, organizer`,
      withdraw: "Withdraw request",
      withdrawnToast: "Request withdrawn",
      waitingTitle: "Waiting on the organizers",
      waitingSubline: "The game stays visible to you meanwhile",
    },
  },
  inbox: {
    description: "Invites sent to you. Accept one to join.",
    loadingA11y: "Loading invites",
    acceptInviteA11y: (title: string) => `Accept the invite to ${title}`,
    joinWaitlistA11y: (title: string) => `Join waitlist for ${title}`,
    declineRequestA11y: (venue: string) => `Decline the request from ${venue}`,
    reviewRequestA11y: (venue: string) => `Review the request from ${venue}`,
    linkSectionTitle: "Have an Invite link?",
    linkLabel: "Invite link",
    linkPlaceholder: "Paste the link you were sent",
    paste: "Paste",
    openLink: "Open link",
    pasteEmpty: "Copy the invite link first, then paste.",
    pasteInvalid:
      "That is not a Temba invite link. Paste the whole link you were sent.",
  },
  seatChoice: {
    occupiedA11y: (side: string, seat: string, name: string) =>
      `${side} ${seat}, ${name}`,
    sitLeft: "Sit left",
    sitRight: "Sit right",
  },
};
