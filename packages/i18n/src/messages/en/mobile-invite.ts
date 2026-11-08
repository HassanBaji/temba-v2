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
    hero: {
      countIn: (inCount: number, seats: number | null) =>
        seats == null ? `${inCount} in` : `${inCount} of ${seats} in`,
      priceEach: (price: string) => `${price} each`,
      openSeatA11y: "Open seat",
      rosterA11y: (inCount: number, seats: number | null) =>
        seats == null
          ? plural("en", inCount, {
              one: "1 player in",
              other: "{n} players in",
            })
          : `${inCount} of ${seats} seats taken`,
      organizerRow: "Organizer",
      levelFits: (range: string) => `${range}, yours fits`,
      levelOutside: (range: string) => `${range}, outside yours`,
      memberNote: (group: string) => `${group}. You're a member.`,
      joinedNote: (group: string) => `${group}. You joined today.`,
      levelCard: {
        fits: (range: string, yours: string) =>
          `This game is ${range}. You're ${yours}, so you fit.`,
        outside: (range: string, yours: string) =>
          `This game is ${range}. You're ${yours}, so joining asks the organizer.`,
        noLevel: (range: string) =>
          `This game is ${range}. Set your level to see if you fit.`,
        signedOut: (range: string) =>
          `This game is ${range}. Sign in to see if you fit, or create an account in a minute. The seat waits.`,
        asksFirst: "Joining asks about the group first.",
      },
      notMemberYet: (sharer: string | null) =>
        sharer
          ? `Shared by ${sharer}. You're not a member yet.`
          : "You're not a member yet.",
      formatRow: "Format",
      rated: "Counts for rating",
      unrated: "Doesn't count for rating",
      courtRow: "Court",
      payAtVenue: (court: string | null) =>
        court ? `${court}, pay at the venue` : "Pay at the venue",
      linkRow: "Link",
      linkUntil: (when: string) =>
        `Works until ${when} or until the seats fill`,
      linkOpen: "Works until the seats fill",
      signInToJoin: "Sign in to join",
      signInSubline: "Your phone number and a minute",
      playingTitle: "You're in this game",
      share: "Share",
      openGameTitle: "Open the game",
      tapASeat: "tap a seat, pick your side after",
      sitHere: "Sit here",
      openSeat: {
        leftOrEither: (side: string) => `${side}, or either`,
        anySide: (team: string) => `${team}, any side`,
      },
      sitHereFootball: (seats: string) =>
        `${seats}. Pick your role and position next`,
      barSheetPadel: "Team, side and the group, in one sheet",
      barSheetFootball: "Role, position and the group, in one sheet",
    },
    joinSheet: {
      title: "Sit here",
      leadPadel:
        "Same as joining in the app. Pick a team, and a side if you like.",
      leadPadelFrom: (seat: string) =>
        `Same as joining in the app. ${seat}, from where you tapped.`,
      leadFootball: (when: string) =>
        `Same as joining in the app. Teams are made ${when}, so you pick a role and a preferred position, not a team.`,
      leadFootballNoTeams:
        "Same as joining in the app. Pick a role and a preferred position; teams come later.",
      team: "Team",
      teamWith: (names: string, seats: string) => `with ${names}, ${seats}`,
      teamEmpty: (seats: string) => `empty, ${seats}`,
      teamFull: "full",
      seats: (n: number) =>
        plural("en", n, { one: "1 seat", other: "{n} seats" }),
      side: "Side",
      sideOptional: "optional",
      sideUsual: (side: string) => `optional, your usual is ${side}`,
      either: "Either",
      sideHint: (team: string, other: string) =>
        `Whoever joins ${team} next takes ${other}, or picks nothing and plays ${other} by default.`,
      alsoJoin: (group: string) => `Also join ${group}`,
      openPolicy: (members: string) =>
        `Anyone with the link can join. ${members}.`,
      approvalPolicy:
        "Organizers approve new members. Your seat is held 24 hours while they decide.",
      offNote:
        "Off means you sit as a guest for this game only. Members see you in the line-up either way.",
      membersOnlyNote: (group: string) =>
        `This game is for members of ${group}, so taking the seat joins the group too.`,
      levelNote:
        "You're outside the level range, so this asks the organizer. Approval seats you where you chose.",
      seatLabel: (team: string, side: string) => `${team}, ${side}`,
      ctaSit: (seat: string) => `Sit in ${seat}`,
      ctaSitPlain: "Take the seat",
      ctaRequest: (seat: string) => `Request the seat, ${seat}`,
      ctaRequestPlain: "Request the seat",
      ctaJoin: "Join the game",
    },
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
      approvalRequired:
        "This group's organizers approve new members. Send a request to join first.",
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
