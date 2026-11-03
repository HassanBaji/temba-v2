import { plural } from "../../plural";

export const profile = {
  wins: (n: number) => plural("en", n, { one: "1 win", other: "{n} wins" }),
  preferredPosition: {
    left: "Left",
    right: "Right",
    either: "Either",
    line: {
      left: "Left side",
      right: "Right side",
      either: "Either side",
    },
    note: {
      unset:
        "Not set. We start you on the left when you register with a partner.",
      left: "We start you on the left when you register with a partner.",
      right: "We start you on the right when you register with a partner.",
      either: "Either side. Your partner's preference decides.",
    },
  },
  player: {
    refusedTitle: "This profile isn't available",
    refusedDescription: "You can see people you share a Group or a Game with.",
    headerSubtitle: (sport: string, venue: string) =>
      `${sport}, plays at ${venue}`,
    overall: "Overall",
    allTime: "All time",
    matches: "Matches",
    won: "Won",
    winRate: "Win rate",
    setsWon: "Sets won",
    goals: "Goals",
    winsInARow: (n: number) =>
      plural("en", n, { one: "1 win in a row", other: "{n} wins in a row" }),
    noCurrentStreak: "No current streak",
    noPreferenceSet: "No preference set",
    playedLeft: (percent: number) => `Played left in ${percent}% of matches`,
    playedRight: (percent: number) => `Played right in ${percent}% of matches`,
    playedBoth: (left: number, right: number) =>
      `Left ${left}%, right ${right}% of matches`,
  },
  football: {
    startingLevel: "Starting Level",
    startingLevelNote: "Football games don't move it yet",
    keeper: "Keeper",
    outfield: "Outfield",
    goalsScored: (n: number) =>
      plural("en", n, { one: "1 goal", other: "{n} goals" }),
    scored: (goals: string) => `scored ${goals}`,
  },
  level: {
    footballStartingCaption: "Starting Level. Football games don’t move it yet",
    confirmProgress: (count: number, total: number) =>
      plural("en", total, {
        one: `${count} of about 1 rated game to confirm`,
        other: `${count} of about {n} rated games to confirm`,
      }),
    topBand: "Top Level band",
    progressTo: (percent: number, next: string) =>
      `${percent}% of the way to ${next}`,
  },
  levelCard: {
    noLevelYet: "No Level yet",
    confirmedRated: (n: number) =>
      plural("en", n, {
        one: "Confirmed, 1 rated match",
        other: "Confirmed, {n} rated matches",
      }),
    distanceProgress: (
      distance: string,
      next: string,
      percent: number,
      band: string,
    ) => `${distance} to ${next} · ${percent}% through ${band}`,
    spokenProvisional: (band: string, level: string, caption: string) =>
      `Level ${band} ${level}, Provisional. ${caption}`,
    spokenLevel: (band: string, level: string, details: string) =>
      `Level ${band} ${level}. ${details}`,
  },
  matches: {
    friendlyGame: "Friendly game",
    friendlyTournament: "Friendly tournament",
    americano: "Americano",
    tournamentRound: (name: string, round: string) => `${name}, ${round}`,
    tournamentRoundNumber: (name: string, round: number) =>
      `${name}, Round ${round}`,
    lastTenTrend: (delta: string) => `Last 10: ${delta}`,
    outcome: {
      won: "Won",
      lost: "Lost",
      draw: "Drew",
    },
    outcomeAgainst: (outcome: string, opponents: string) =>
      `${outcome} against ${opponents}`,
    outcomeScore: (outcome: string, score: string) => `${outcome} ${score}`,
    versus: (opponents: string) => `vs ${opponents}`,
    namesWithAnd: (names: string[]) => names.join(" and "),
    namesWithAmpersand: (names: string[]) => names.join(" & "),
    withPartnerAt: (partners: string, venue: string) =>
      `with ${partners}, ${venue}`,
    dateComma: (date: string, rest: string) => `${date}, ${rest}`,
    spokenParts: (parts: string[]) => parts.join(", "),
    ratingUnchanged: "rating unchanged",
    ratingUp: (amount: string) => `rating up ${amount}`,
    ratingDown: (amount: string) => `rating down ${amount}`,
  },
  lastTen: {
    noGamesYet: "No games yet.",
    record: (won: number, lost: number) => `${won} won, ${lost} lost`,
    recordWithDrawn: (won: number, lost: number, drawn: number) =>
      `${won} won, ${lost} lost, ${drawn} drawn`,
    latest: "Latest",
    seeAllGames: (n: number) =>
      plural("en", n, { one: "See all 1 game", other: "See all {n} games" }),
    filterEmpty: "No games here.",
    chipAll: (n: number) => `All ${n}`,
    chipWon: (n: number) => `Won ${n}`,
    chipLost: (n: number) => `Lost ${n}`,
  },
  matchSheet: {
    openGame: "Open game",
    playerLevel: (name: string, level: string) => `${name}, Level ${level}`,
    playerProvisional: (name: string) => `${name}, Level still Provisional`,
    ratingOf: (name: string) => `${name}'s rating`,
    ratingSpoken: (
      label: string,
      before: string,
      after: string,
      delta: string,
    ) => `${label}, ${before} to ${after}, ${delta}`,
  },
  allTime: {
    playingSince: (year: number) => `Playing padel since ${year}`,
    since: (year: number) => `Since ${year}`,
    goals: "Goals",
    sets: "Sets",
    mostPlayedTeammate: "Most played teammate",
    mostPlayedPartner: "Most played partner",
  },
  checklist: {
    tasks: {
      name: {
        title: "Add your name",
        description: "Shown to organizers and the people you play with.",
        time: "30 sec",
      },
      photo: {
        title: "Add a profile photo",
        description: "So organizers can spot you at the court.",
        time: "1 min",
      },
      email: {
        title: "Add and verify your email",
        description: "Receipts, and a way back in if you change number.",
        time: "1 min",
      },
      sports: {
        title: "Pick your sports and level",
        description: "Unlocks matched games and a rating.",
        time: "2 min",
      },
    },
    countOf: (done: number, total: number) => `${done} OF ${total}`,
    allDone:
      "All done. Organizers see a full profile and your games are matched to your level.",
    shortTasks: (n: number) =>
      `${n === 3 ? "Three" : String(n)} short tasks, any order. Each one unlocks something.`,
    tasksLeft: (n: number) =>
      plural("en", n, {
        one: "1 task left. Any order, each one saves on its own.",
        other: "{n} tasks left. Any order, each one saves on its own.",
      }),
    findGames: "Find games",
    continueToGames: "Continue to games",
    moreTasks: (n: number) =>
      plural("en", n, { one: "{n} more task", other: "{n} more tasks" }),
    allTasks: "All tasks",
    youAreIn: (firstName: string) => `You're in, ${firstName}.`,
    youAreInPlain: "You're in.",
  },
  chrome: {
    settingsPending: (n: number) => `Settings, ${n} pending invites`,
  },
};
