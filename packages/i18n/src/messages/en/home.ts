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
    allSeatsFilled: "All seats filled",
    openSeats: (n: number) =>
      plural("en", n, { one: "Open seat", other: "{n} open seats" }),
    friendly: "Friendly",
    parts: (parts: string[]) => parts.join(", "),
    until: (clock: string) => `until ${clock}`,
    untilFor: (clock: string, minutes: number) =>
      `until ${clock}, ${minutes} min`,
  },
  level: {
    heading: {
      padel: "Your padel Level",
      football: "Your football Level",
    },
    numberLabel: "Level",
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
    winRateAfter: (n: number) =>
      plural("en", n, {
        one: "Win rate shows after 1 match",
        other: "Win rate shows after {n} matches",
      }),
    winRate: "win rate",
    outcomeLetter: { won: "W", lost: "L", draw: "D" },
  },
  seats: {
    full: "Full",
    spotsOpen: (n: number) =>
      plural("en", n, { one: "One spot open", other: "{n} spots open" }),
  },
  standing: {
    groupFallback: "Group",
    ofCount: (n: number) => `of ${n}`,
    unranked: "—",
    noCountedGames: "No counted games yet",
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
  upNextCard: {
    spoken: (title: string, day: string, time: string, place: string) =>
      `Next up, ${title}, ${day} ${time}, ${place}`,
    ended: "Ended",
    oneOfThisWeek: (n: number) => `1 of ${n} this week`,
    nothingThisWeek: "nothing this week",
    today: "Today",
    sportWithGroup: (sport: string, group: string) => `${sport} ${group}`,
    to: (clock: string) => `to ${clock}`,
    whoIn: (filled: number, total: number) => `${filled} of ${total} in`,
    allIn: (total: number) => (total === 4 ? "All four in" : `All ${total} in`),
    scope: (parts: string[]) => parts.join(", "),
    teams: (n: number) =>
      plural("en", n, { one: "1 team", other: "{n} teams" }),
    teamsAreMade: "Teams are made",
    leftSide: "Left side",
    rightSide: "Right side",
    open: "Open",
    vs: "vs",
    andMore: (n: number) => `and ${n} more`,
    playersSpoken: (names: string[]) => names.join(", "),
    teamSpoken: (team: string, names: string[]) =>
      `${team}: ${names.join(", ")}`,
    openSeatSpoken: (side: string) => `Open seat, ${side}`,
    seatSpoken: (name: string, side: string) => `${name}, ${side}`,
    positions: {
      keeperCount: (n: number, max: number) => `${n} of ${max}`,
      keeper: "keeper",
      defenders: (n: number) =>
        plural("en", n, { one: "defender", other: "defenders" }),
      mid: "mid",
      forwards: (n: number) =>
        plural("en", n, { one: "forward", other: "forwards" }),
    },
    step: {
      seatsLeft: (n: number) =>
        plural("en", n, { one: "One seat left", other: "{n} seats left" }),
      seatLeftOnSide: (name: string) => `One seat left, on ${name}'s side`,
      inviteBody:
        "Invite someone to fill it, or share the game with your group.",
      poolShort: (n: number) =>
        plural("en", n, {
          one: "You're in. One more and it's on",
          other: "You're in. {n} more and it's on",
        }),
      poolShortBody: "Teams are made when it fills.",
      poolFullOrganizer: "Full. Time to make the teams",
      poolFullOrganizerBody:
        "Balance them by level and position, or pick them yourself.",
      poolFull: "Full. Teams come next",
      poolFullBody: "The organizer makes the teams before kick-off.",
      inTeam: (team: string) => `You're in ${team}`,
      inTeamAt: (team: string, where: string) => `You're in ${team}, ${where}`,
      where: {
        keeper: "in goal",
        def: "at the back",
        mid: "in midfield",
        fwd: "up front",
      },
      shirtDark: "Wear a dark shirt. The lineups are on the game.",
      shirtLight: "Wear a light shirt. The lineups are on the game.",
      lineupsOnGame: "The lineups are on the game.",
      beThereBy: (clock: string) => `Be there by ${clock}`,
      beThereByBody: (place: string) => `Everyone's in. ${place}.`,
      playingNow: "Playing now",
      playingNowBody: "Add the score when the last point is played.",
      howDidItGo: "How did it go?",
      howDidItGoBody:
        "Either side enters the score, the other confirms. Levels move once it's confirmed.",
      drawOut: "The draw is out",
      drawOutBody: "Your rounds and courts are on the game.",
      drawPending: "Waiting for the draw",
      drawPendingBody: "Rounds are posted once the teams are in.",
      payCourt: "Finish paying for the court",
      payCourtBody: "The booking holds until it's paid.",
      makeGame: "Turn it into a game",
      makeGameBody: "Add players so they can join, and keep the score.",
      gameSet: "Your game is set",
      gameSetBody: "Players and the score live on the game.",
      courtBooked: "Your court is booked",
      courtBookedBody: "Share it with the people you're playing with.",
    },
    action: {
      details: "Details",
      directions: "Directions",
      seeLineups: "See the lineups",
      makeTeams: "Make teams",
      addScore: "Add the score",
      seeRounds: "See your rounds",
    },
    allGames: "All games",
    openWeekBody: (n: number) =>
      plural("en", n, {
        one: "One game in your groups still has room. Take a seat, or start your own.",
        other:
          "{n} games in your groups still have room. Take a seat, or start your own.",
      }),
    openRowDetail: (place: string, seats: string) => `${place}, ${seats}`,
    join: "Join",
    joinSpoken: (title: string) => `Join ${title}`,
  },
  sportSwitch: {
    spoken: (sport: string, band: string) => `${sport}, ${band}`,
    spokenOvr: (sport: string, ovr: string) => `${sport}, level ${ovr}`,
  },
  levelSection: {
    title: {
      padel: "Padel level",
      football: "Football level",
    },
    opensRatings: "Opens Ratings",
  },
  trend: {
    title: "Trend",
    lastMatches: (n: number) =>
      plural("en", n, { one: "last match", other: "last {n} matches" }),
    from: (from: string) => `from ${from} to `,
    matchesAgo: (n: number) =>
      plural("en", n, { one: "1 match ago", other: "{n} matches ago" }),
    changesAgo: (n: number) =>
      plural("en", n, { one: "1 change ago", other: "{n} changes ago" }),
    latest: "latest",
    legend: {
      won: "solid won",
      drawn: "half drawn",
      lost: "open lost",
      set: "grey set",
    },
    legendSeparator: ", ",
    spoken: (from: string, to: string, window: string) =>
      `Level went from ${from} to ${to}, ${window}`,
  },
  lastTen: {
    title: "Last 10",
    oldestFirst: "oldest first",
    won: "won",
    drawn: "drawn",
    lost: "lost",
    percentWon: (percent: number) => `${percent}%`,
    percentWonLabel: "won",
    spoken: (won: number, drawn: number, lost: number) =>
      `${won} won, ${drawn} drawn, ${lost} lost`,
  },
  stats: {
    title: "Stats",
    ratedMatches: (n: number) =>
      plural("en", n, { one: "1 rated match", other: "{n} rated matches" }),
    matches: (n: number) =>
      plural("en", n, { one: "1 match", other: "{n} matches" }),
    winRate: "Win rate",
    played: (n: number) => `${n} played`,
    winRateAfter: (n: number) => `after ${n} played`,
    winsInARow: "Wins in a row",
    bestIs: (n: number) => `best is ${n}`,
    bestRun: "Best run",
    winsIn: (month: string) => `wins, in ${month}`,
    wins: "wins",
    goals: "Goals",
    perGame: (value: string) => `${value} a game`,
    cleanSheets: "Clean sheets",
    ofMatches: (n: number) =>
      plural("en", n, { one: "of 1 match", other: "of {n} matches" }),
    unbeaten: "Unbeaten",
    tileSpoken: (label: string, value: string, caption: string) =>
      `${label} ${value}, ${caption}`,
  },
  standingSection: {
    groupsOf: (shown: number, total: number) => `${shown} of ${total} groups`,
    countedGames: (n: number) =>
      plural("en", n, { one: "1 counted game", other: "{n} counted games" }),
    moreGroups: (n: number) =>
      plural("en", n, {
        one: "1 more group, no counted games yet",
        other: "{n} more groups, no counted games yet",
      }),
    of: (n: number) => `of ${n}`,
  },
  latest: {
    newMarkFrom: (name: string) => `New mark from ${name}`,
    newMark: "New mark",
    line: (kind: string, game: string) => `${kind}, for ${game}`,
  },
};
