import { plural } from "../../plural";

const games = (count: number) =>
  plural("en", count, { one: "1 game", other: "{n} games" });
const rounds = (count: number) =>
  plural("en", count, { one: "1 Round", other: "{n} Rounds" });
const points = (count: number) =>
  plural("en", count, { one: "1 pt", other: "{n} pts" });

export const tournamentRounds = {
  tabs: {
    label: "Tournament sections",
    teams: "Teams",
    rounds: "Rounds",
    standings: "Standings",
    bracket: "Bracket",
  },
  organizerChip: "Organizer",
  lead: {
    teams: "Every team in the draw, by Pool.",
    roundsEmpty: (roundCount: number, gamesPerRound: number) =>
      `Everyone plays in ${rounds(roundCount)} of ${games(gamesPerRound)}.`,
    roundsDrafted: (count: number) =>
      `${plural("en", count, { one: "1 Round drafted", other: "{n} Rounds drafted" })}. Swap any pairing; the others stay valid. Nothing is posted yet.`,
    roundsOrganizer:
      "You can enter or fix any score, and make the next Round when you like.",
    roundsPlayer:
      "Either team enters the score; the other confirms. Organizers can enter or fix any game.",
    points: "Points: win 3, draw 1.",
  },
  progress: {
    roundOf: (round: number, total: number) => `Round ${round} of ${total}`,
    onCourt: "on court",
    played: (count: number) => `${count} played`,
    notStarted: "No Round posted yet",
    stripLabel: (played: number, total: number) =>
      `${played} of ${total} Rounds played`,
  },
  ways: {
    prompt: "How do you want to make the Rounds?",
    generateAllTitle: (count: number) =>
      plural("en", count, {
        one: "Generate the Round",
        other: "Generate all {n} Rounds",
      }),
    generateAllBody:
      "A full round-robin in one go. Swap any pairing, court or time before you post.",
    generateAllNext: "Drafts first, nothing posted yet",
    oneAtATimeTitle: "One Round at a time",
    oneAtATimeBody:
      "Round 1 now, Round 2 when the scores are in. Good when teams drop out or arrive late.",
    oneAtATimeNext: "Round 1 as a draft, nothing posted yet",
    byHandTitle: "Pair them yourself",
    byHandBody:
      "An empty Round 1. Tap two teams to make a game; Temba remembers who has played whom.",
    byHandNext: "An empty Round 1, nothing posted yet",
    courts: "Courts",
    courtsValue: (count: number) =>
      plural("en", count, {
        one: "1 Court",
        other: "1 to {n}, all {n} at once",
      }),
    slot: "Slot",
    slotValue: (minutes: number, time: string) =>
      `${minutes} minutes, from ${time}`,
    points: "Points",
    pointsValue: "Win 3, draw 1, loss 0",
    footer:
      "Whatever you pick, every Round can be edited until its games start, and you can switch ways later. Players see a Round only once you post it.",
    continue: "Continue",
    continuing: "Working…",
  },
  round: {
    code: (round: number) => `R${round}`,
    title: (round: number) => `Round ${round}`,
    games,
    draft: "draft",
    posted: "posted",
    onCourt: "on court",
    played: "played",
    scoresIn: (scored: number, total: number) => `${scored} of ${total} in`,
    expand: (round: number) => `Show Round ${round}`,
    collapse: (round: number) => `Hide Round ${round}`,
    roundRobin: (count: number) => `Round robin, ${rounds(count)}`,
    regenerate: "Regenerate",
    regenerating: "Regenerating…",
    swap: "Swap",
    swapFor: (team: string) => `Swap ${team}'s opponent`,
    enterScore: "Enter score",
    enterScoreFor: (team1: string, team2: string) =>
      `Enter the score for ${team1} against ${team2}`,
    edit: "Edit",
    editFor: (team1: string, team2: string) =>
      `Change the score for ${team1} against ${team2}`,
    confirm: "Confirm",
    waiting: "waiting for confirm",
    notFinished: "didn't finish",
    notPlayed: "not played",
    notYet: "Not on court yet",
    vs: "vs",
    postFirst: (round: number) =>
      `Post Round ${round}, keep the rest as drafts`,
    postOne: (round: number) => `Post Round ${round}`,
    postAll: (count: number) =>
      plural("en", count, {
        one: "Post the Round",
        other: "Post all {n} Rounds",
      }),
    posting: "Posting…",
    postFooter:
      "Posting a Round creates its games. Drafts stay editable and invisible to players.",
    complete: (round: number, total: number) =>
      `Round ${round} complete, ${total} of ${total} scores in`,
    completeLine: "Standings updated.",
  },
  notMade: {
    title: (round: number) => `Round ${round}, not made yet`,
    meta: (time: string) => `${time}. Best made once the Round before is in`,
    generate: (round: number) => `Generate Round ${round}`,
    generating: "Generating…",
    pairMyself: "Pair myself",
    generateRest: "Generate the rest",
    note: "Generated Rounds avoid repeats and, from Round 3 on, pair teams on similar points so the day stays close.",
    later: (from: number, to: number) =>
      from === to
        ? `Round ${from} appears here once the organizer posts it.`
        : `Rounds ${from} to ${to} appear here once the organizer posts them.`,
    laterShort: (from: number, to: number) =>
      from === to ? `Round ${from}, later` : `Rounds ${from} to ${to}, later`,
  },
  repeats: {
    line: (round: number, pair: string) =>
      `${pair} meet again in Round ${round}`,
  },
  swap: {
    title: (round: number, court: string) => `Round ${round}, ${court}`,
    lead: (team: string, opponent: string) =>
      `Pick a new opponent for ${team}. ${opponent} take the place of the team you choose.`,
    chooseBelow: "choose below",
    teamsInRound: (round: number) => `Teams in Round ${round}`,
    consequence: (court: string, displaced: string, opponent: string) =>
      `${court}, ${displaced} play ${opponent}`,
    note: "Later Rounds re-pair themselves so nobody meets twice. If that isn't possible, you'll see which Round repeats before you confirm.",
    repeats: "This swap leaves a repeat:",
    confirm: "Swap them",
    swapping: "Swapping…",
  },
  pair: {
    title: (round: number) => `Round ${round}`,
    lead: "Tap two teams to make a game. Teams go to the next free Court.",
    gamesIn: (round: number) => `Games in Round ${round}`,
    made: (made: number, total: number) => `${made} of ${total} made`,
    pickBelow: "pick below",
    removeGame: (team1: string, team2: string) =>
      `Take apart ${team1} against ${team2}`,
    freeTeams: "Free teams",
    left: (count: number, court: string | null) =>
      court ? `${count} left, tap one for ${court}` : `${count} left`,
    points,
    notPlayed: "Not played them",
    playedIn: (round: number) => `Played them in Round ${round}`,
    otherPool: "Another Pool",
    note: "Teams already played are greyed, not hidden. Points are shown so you can keep it close or mix it up.",
    post: (round: number, left: number) =>
      left > 0
        ? `Post Round ${round}, ${games(left)} to go`
        : `Post Round ${round}`,
    fillRest: "Fill the rest",
    filling: "Filling…",
  },
  score: {
    title: (round: number, court: string) => `Round ${round}, ${court}`,
    lead: (minutes: number, opponents: string) =>
      `Games won in the ${minutes} minutes. ${opponents} get a tap to confirm; if they don't within 10 minutes, it stands.`,
    leadOrganizer: (minutes: number) =>
      `Games won in the ${minutes} minutes. As the organizer, your score is final.`,
    games: "games",
    you: "(you)",
    fewer: (team: string) => `One game fewer for ${team}`,
    more: (team: string) => `One game more for ${team}`,
    gamesFor: (team: string, count: number) => `${team}: ${games(count)}`,
    youWin: "You win, 3 points",
    youLose: "You lose this one, 0 points",
    draw: "A draw, 1 point each",
    teamWins: (team: string) => `${team} win, 3 points`,
    otherGetsNothing: (team: string) => `${team} get 0. A tie would be 1 each.`,
    drawLine: "Both teams get 1.",
    countsForRating: "counts for rating",
    didntFinish: "Didn't finish",
    marking: "Marking…",
    save: (score: string) => `Save ${score}`,
    saving: "Saving…",
  },
  confirm: {
    title: (name: string, score: string) => `${name} entered ${score}`,
    lead: (round: number, court: string, name: string, time: string) =>
      `Round ${round}, ${court}. Confirm it, or correct it and ${name} confirms instead. Stands on its own at ${time}.`,
    confirm: (score: string) => `Confirm ${score}`,
    confirming: "Confirming…",
    correct: "Correct it",
    cantAgree:
      "Can't agree? Either of you can ask the organizer, who can set any score.",
  },
  standings: {
    team: "Team",
    played: "P",
    won: "W",
    drawn: "D",
    lost: "L",
    points: "Pts",
    playedLong: "Played",
    wonLong: "Won",
    drawnLong: "Drawn",
    lostLong: "Lost",
    pointsLong: "Points",
    throughLine: "Through to the knockout",
    winner: "Pool winner",
    ties: "Ties: head-to-head, then wins minus losses, then games difference.",
    drawOrder:
      "Nothing played yet, so this is the draw order. It sorts itself after the first scores.",
  },
  yourRounds: {
    title: "Your Rounds",
    meta: (played: number, total: number) => `${played} of ${total} played`,
    won: (round: number) => `Round ${round}, won`,
    lost: (round: number) => `Round ${round}, lost`,
    drawn: (round: number) => `Round ${round}, drawn`,
    onCourt: (round: number, court: string) =>
      `Round ${round}, on court now, ${court}`,
    waiting: (round: number) => `Round ${round}, waiting for confirm`,
    notFinished: (round: number) => `Round ${round}, didn't finish`,
    at: (round: number, time: string) => `Round ${round}, ${time}`,
    later: (from: number, to: number) =>
      from === to
        ? `Round ${from} once the organizer posts it`
        : `Rounds ${from} to ${to} once the organizer posts them`,
  },
  teams: {
    pool: (label: string, count: number) =>
      `${label}, ${plural("en", count, { one: "1 team", other: "{n} teams" })}`,
  },
  draw: {
    lead: (teamCount: number, poolCount: number, roundCount: number) =>
      `${plural("en", teamCount, { one: "1 team", other: "{n} teams" })}, ${plural("en", poolCount, { one: "one Pool", other: "{n} Pools" })}, ${rounds(roundCount)}. Random, nobody seeded.`,
    post: "Post the draw, then make Rounds",
    footer: "Posting closes the seats. Rounds come next, your way.",
  },
  undo: {
    action: "Undo the draw",
    locked: "Undo the draw (not once a score is in)",
  },
  loadFailed: "The Rounds could not be loaded",
};
