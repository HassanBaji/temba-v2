import { plural } from "../../plural";

const CARDINAL_WORDS = [
  "Zero",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
] as const;

function cardinal(count: number) {
  return CARDINAL_WORDS[count] ?? String(count);
}

/** The Home header spells out counts below ten only. */
function smallCardinal(count: number) {
  return count < 10 ? cardinal(count) : String(count);
}

export const home = {
  comingUp: {
    tournamentFallback: "Tournament",
    gameFallback: "Game",
    versus: (opponent: string) => `vs ${opponent}`,
    allSeatsFilled: "All seats filled",
    openSeats: (n: number) =>
      plural("en", n, { one: "Open seat", other: "{n} open seats" }),
  },
  level: {
    window: (n: number) =>
      plural("en", n, { one: "last 1 match", other: "last {n} matches" }),
    provisionalLead: "Provisional Level.",
    provisionalRest: (remaining: number) =>
      plural("en", remaining, {
        one: " Hatched means unconfirmed — play about 1 more rated game and your Level confirms.",
        other:
          " Hatched means unconfirmed — play about {n} more rated games and your Level confirms.",
      }),
    confirmedLead: "Level confirmed.",
    confirmedRest: " Your Level now moves with every rated game you play.",
    progressTo: (percent: number, next: string) =>
      `${percent}% of the way to ${next}`,
  },
  levelChange: {
    up: "Up",
    down: "Down",
    none: "No change",
  },
  nextGame: {
    addResults: "Add results",
    invitePlayer: "Invite a player",
    viewGame: "View game",
    playingNow: "Playing now",
  },
  noGames: {
    createGroup: "Create Group",
    create: "Create",
    createGroupFirst: "Create a Group first, then you can create a Game.",
    browse: "Browse available games.",
  },
  recentForm: {
    noStreak: "No streak",
    winStreak: (n: number) =>
      plural("en", n, {
        one: "Building that win streak",
        other: "On a {n} games Win streak",
      }),
    loseStreak: (n: number) =>
      plural("en", n, {
        one: "Painful loss",
        other: "On a {n} games Lose streak",
      }),
    slotsLeft: (n: number) =>
      plural("en", n, {
        one: "One slot left to fill",
        other: `${cardinal(n)} slots left to fill`,
      }),
    winRateAfterThree: "win rate after 3 games",
    winRate: "win rate",
  },
  seats: {
    full: "Full",
    spotsOpen: (n: number) =>
      plural("en", n, { one: "One spot open", other: "{n} spots open" }),
  },
  standing: {
    groupFallback: "Group",
    ofCount: (n: number) => `of ${n}`,
  },
  stateLine: {
    invitesWaiting: (n: number) =>
      plural("en", n, {
        one: "One invite waiting",
        other: `${smallCardinal(n)} invites waiting`,
      }),
    gamesBooked: (n: number) =>
      plural("en", n, {
        one: "One game booked",
        other: `${smallCardinal(n)} games booked`,
      }),
  },
};
