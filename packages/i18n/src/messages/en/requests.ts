import { plural } from "../../plural";

/**
 * Requests waiting on an Organizer or Group approver, on Home, on
 * Notifications and on the All requests screen: Level range requests, Seat
 * holds and Group join requests, read as one card.
 */
export const requests = {
  title: "Requests",
  newCount: (n: number) => `${n} new`,
  allTitle: "All requests",
  all: "All",
  games: "Games",
  groups: "Groups",
  waiting: (n: number) => `${n} waiting`,
  allAnswered: "All answered",
  nothingWaiting: "Nothing waiting",
  nothingWaitingNote: "New requests show up here.",
  approve: "Approve",
  decline: "Decline",
  undo: "Undo",
  approveName: (name: string) => `Approve ${name}`,
  declineName: (name: string) => `Decline ${name}`,
  undoName: (name: string) => `Undo the answer for ${name}`,
  approveBoth: "Approve both",
  approveAll: (n: number) => `Approve all ${n}`,
  moreRequests: (n: number) =>
    plural("en", n, { one: "{n} more request", other: "{n} more requests" }),
  next: {
    two: (first: string, second: string) => `Next: ${first} and ${second}`,
    one: (name: string) => `Next: ${name}`,
    many: (first: string, second: string, more: number) =>
      `Next: ${first}, ${second} and ${more} more`,
  },
  notificationsNote:
    "Most urgent first: seats on hold before group requests. Any organizer of that group can answer.",
  gamesNote:
    "A held seat frees itself when the hold runs out or when you decline.",
  gameNote: (group: string) =>
    `Any organizer of ${group} can decide. A held seat frees itself when the hold runs out or when you decline.`,
  groupNote: "Any organizer of the group can decide.",
  blockName: (name: string) => `Reject and block ${name}`,
  loadFailed: "Requests could not be loaded",
  userFallback: "A player",
  groupFallback: "the group",
  sportNoun: { padel: "padel", football: "football" },
  want: {
    seat: (day: string, clock: string, sport: string) =>
      `Seat in ${day} ${clock} ${sport}`,
    seatNoTime: (sport: string) => `Seat in the ${sport} game`,
    group: (group: string) => `Join ${group}`,
  },
  gameHeading: (day: string, clock: string, sport: string) =>
    `${day} ${clock} ${sport}`,
  gameFill: (inCount: number, capacity: number) =>
    `${inCount} of ${capacity} in`,
  gameFillHeld: (inCount: number, capacity: number, held: number) =>
    plural("en", held, {
      one: `${inCount} of ${capacity} in, {n} seat held`,
      other: `${inCount} of ${capacity} in, {n} seats held`,
    }),
  context: {
    member: (group: string) => `${group} member.`,
    under: (level: string, range: string) =>
      `Level ${level} is under this game’s ${range}.`,
    above: (level: string, range: string) =>
      `Level ${level} is above this game’s ${range}.`,
    inside: (level: string, range: string) =>
      `Level ${level} is now inside this game’s ${range}.`,
    noLevel: (range: string) => `No level yet. This game is ${range}.`,
    outsideNoRange: "Asked to play outside this game’s level.",
    notInGroupYourLink: (group: string) =>
      `Not in ${group} yet, came through your link.`,
    notInGroupLinkFrom: (group: string, name: string) =>
      `Not in ${group} yet, came through ${name}’s link.`,
    notInGroupLink: (group: string) =>
      `Not in ${group} yet, came through the game link.`,
    addsToGroup: "Approving adds them to the group too.",
    yourLink: "Came through your link.",
    invitedBy: (name: string) => `Invited by ${name}.`,
    inviteLink: "Came through an invite link.",
    groupPage: "Asked from the group page.",
    gamesWithMembers: (n: number) =>
      plural("en", n, {
        one: "Has played {n} game with your members.",
        other: "Has played {n} games with your members.",
      }),
    noGamesWithMembers: "No games with your members yet.",
    note: (note: string) => `“${note}”`,
  },
  time: {
    seatHeld: "seat held",
    starts: "starts",
    asked: "asked",
    minutesLeft: (n: number) => `${n} min left`,
    hoursLeft: (n: number) => `${n}h left`,
    daysLeft: (n: number) => `${n}d left`,
    inMinutes: (n: number) => `in ${n} min`,
    inHours: (n: number) => `in ${n}h`,
    inDays: (n: number) => `in ${n}d`,
    justNow: "just now",
    minutesAgo: (n: number) => `${n} min ago`,
    hoursAgo: (n: number) => `${n}h ago`,
    daysAgo: (n: number) => `${n}d ago`,
  },
  done: {
    inGame: (weekday: string) => `is in ${weekday}’s game`,
    inGameAndGroup: (weekday: string) =>
      `is in ${weekday}’s game and in the group`,
    onWaitlist: (weekday: string) => `goes on ${weekday}’s Waitlist`,
    onWaitlistAndGroup: (weekday: string) =>
      `goes on ${weekday}’s Waitlist and into the group`,
    inTheGame: "is in the game",
    onTheWaitlist: "goes on the Waitlist",
    canJoin: (weekday: string) => `can now join ${weekday}’s game`,
    canJoinGame: "can now join the game",
    inGroup: (group: string) => `is now in ${group}`,
    declinedSeatFreed: "declined, seat freed",
    declined: "declined",
  },
  failed: (name: string) =>
    `Couldn’t answer ${name}’s request. It may already be answered.`,
};
