import { plural } from "../../plural";

export const football = {
  status: {
    cancelled: "Cancelled",
    played: "Played",
    playedScoreMissing: "Played, score missing",
    teamsSet: "Teams set",
    teamsSetOn: (weekday: string) => `Teams set, ${weekday}`,
    upcoming: "Upcoming",
    upcomingOn: (weekday: string) => `Upcoming, ${weekday}`,
  },
  lineup: {
    positions: {
      def: "Defender",
      mid: "Midfield",
      fwd: "Forward",
    },
    keeperSeatsTaken: "both keeper seats taken",
    keeperSeatsOpen: (left: number, total: number) =>
      `${left} of ${total} keeper seats open`,
    keepersIn: (n: number) => `${n} keepers in`,
    oneKeeperOneMoreNeeded: "1 keeper, one more needed",
    noKeeperYet: "no keeper yet",
    positionCountsLine: (def: number, mid: number, fwd: number, gk: number) =>
      `In so far: ${def} DEF, ${mid} MID, ${fwd} FWD, ${gk} GK.`,
    bibs: {
      black: "Black",
      white: "White",
      red: "Red",
      navy: "Dark blue",
      sky: "Light blue",
      green: "Green",
      yellow: "Yellow",
      orange: "Orange",
      purple: "Purple",
      pink: "Pink",
      grey: "Grey",
    },
    teamsMethod: {
      manual: "Set by organizer",
      level: "Balanced by level",
    },
    nobodyInYet: "Nobody is in yet.",
    stillToPlace: (n: number) => `${n} still to place.`,
    bothTeamsNeedPlayers: "Both teams need players.",
    sideHasExtra: (team: string, extra: number) =>
      `${team} has ${extra} extra. Move one across before publishing.`,
    draw: "Draw.",
    winBy: (team: string, margin: number) => `${team} win by ${margin}.`,
    scorersExceed: (team: string, score: number) =>
      `${team} scorers add up to more than ${score}.`,
  },
  board: {
    outfieldLine: (inCount: number, seats: number) =>
      `${inCount} of ${seats} in`,
    keeperNoteClaimed: (perGame: number, name: string) =>
      `One keeper per team, so ${perGame} per game. ${name} has the first.`,
    keeperNoteUnclaimed: (perGame: number) =>
      `One keeper per team, so ${perGame} per game. Nobody has claimed one yet.`,
    keeperSeatsBothTaken: "both taken",
    keeperSeatsLeft: (n: number) =>
      plural("en", n, { one: "1 seat left", other: "{n} seats left" }),
    seatKeeper: "Keeper",
    seatPlayerPrefers: (code: string) => `Player, prefers ${code}`,
    joinAsKeeper: "Join as keeper",
    joinAsPosition: (code: string) => `Join as ${code}`,
    joinWithPrice: (lead: string, price: string) => `${lead}, ${price}`,
    seatsOpen: (n: number) =>
      plural("en", n, { one: "1 seat open", other: "{n} seats open" }),
    everyonePlaced: (
      team1: string,
      average1: string,
      team2: string,
      average2: string,
    ) => `Everyone placed. ${team1} avg ${average1}, ${team2} avg ${average2}.`,
    keeperCount: (n: number) =>
      plural("en", n, { one: "1 keeper", other: "{n} keepers" }),
    goalsNote:
      "Goals count toward player form, not rating. Skip if nobody kept track.",
    goalsNamed: (
      named1: number,
      score1: number,
      team1: string,
      named2: number,
      score2: number,
      team2: string,
    ) =>
      `${named1} of ${score1} ${team1} goals and ${named2} of ${score2} ${team2} goals named.`,
    bothSidesConfirmed: "Both sides confirmed.",
    confirmedByOrganizer: "Confirmed by the Organizer.",
    waitingOrganizerFor: (team: string) =>
      `the Organizer to confirm for ${team}`,
    waitingPlayerFrom: (team: string) => `one player from ${team} to confirm`,
    waitingFor: (who: string) => `Waiting for ${who}.`,
    waitingForBoth: (first: string, second: string) =>
      `Waiting for ${first} and ${second}.`,
    waitingOrganizerBoth:
      "Waiting for the Organizer to confirm for both sides.",
    waitingEachSide: "Waiting for one player from each side to confirm.",
    youPlayInAs: (team: string, code: string) =>
      `You play in ${team} as ${code}.`,
    youPlayIn: (team: string) => `You play in ${team}.`,
  },
  details: {
    priceLabel: "Price",
    durationLabel: "Duration",
    minutesShort: (n: number) => `${n}m`,
    waitlistedTitle: "You're on the Waitlist",
    registeredTitle: "You're in",
    joinTitle: "Join this Game",
    fullTitle: "This Game is full",
    joinWaitlistAction: "Join waitlist",
    fallbackTitle: "Game",
  },
  hub: {
    sections: {
      result: {
        title: "Needs your confirmation",
        meta: "score in or missing",
      },
      open: { title: "Seats open", meta: "teams not set" },
      teams: { title: "Teams set", meta: "see your team" },
      full: { title: "Full", meta: "waitlist open" },
    },
    card: {
      waitingForPlayers: "Waiting for players",
      playersOf: (taken: number, seats: number) =>
        plural("en", seats, {
          one: `${taken} of 1 player`,
          other: `${taken} of {n} players`,
        }),
      openSpots: (n: number) =>
        plural("en", n, {
          one: ", 1 open spot",
          other: ", {n} open spots",
        }),
    },
  },
  selfPlacement: {
    beginner: {
      label: "Beginner",
      description: "Still finding your feet. Now and then.",
    },
    casual: {
      label: "Casual",
      description: "Pick-up games, holds a position. 1–2× a week.",
    },
    competitive: {
      label: "Competitive",
      description:
        "Plays local tournaments, lasts the full match. 2–3× a week.",
    },
    pro: {
      label: "Pro",
      description:
        "Club or academy background, dictates the game. Several times a week.",
    },
  },
  sizeLine: (sideSize: string, players: number) =>
    `${sideSize} · ${players} players`,
};
