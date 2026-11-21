import { plural } from "../../plural";
import { tournamentRounds } from "./tournament-rounds";

const { ordinal } = tournamentRounds.shareCard;

type BoardKind = "social" | "padel_match" | "football";

const eventName = (kind: BoardKind) =>
  kind === "social" ? "the Social" : "the game";

const points = (count: number) =>
  plural("en", count, { one: "1 point", other: "{n} points" });

const record = (won: number, drawn: number, lost: number) =>
  `${won} won, ${drawn} drawn, ${lost} lost`;

const signed = (value: number) =>
  value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0";

export const liveBoard = {
  joiner: " & ",
  list: (parts: readonly string[]) => parts.join(", "),
  signed,
  menu: {
    showOnTv: "Show on TV",
    showOnTvHint: "A live board for the room",
  },
  screens: {
    on_court: "On court",
    table: "Standings",
    next_up: "Next up",
    scoreboard: "Scoreboard",
  },
  settings: {
    rotate: "Rotate screens",
    rotateHint: (seconds: number) =>
      `On court, standings, next up. ${plural("en", seconds, { one: "1 second each", other: "{n} seconds each" })}`,
    rotateOffHint: "Off holds the board on one screen",
    qr: "QR to follow",
    qrHint: (kind: BoardKind) =>
      `Lets the room open ${eventName(kind)} on a phone`,
    colorScheme: "Colour scheme",
    colorSchemeHint: "Dark suits most TVs",
    dark: "Dark",
    light: "Light",
  },
  sheet: {
    title: "Show on TV",
    lead: (kind: BoardKind): string =>
      kind === "social"
        ? "A live board for the room: scores as they are saved, standings and who plays next."
        : "A live board for the room: the score as it is saved, with both sides.",
    codeLead: (address: string) =>
      `On the TV’s browser, open ${address} and enter`,
    copyLink: "Copy board link",
    linkCopied: "Board link copied",
    openHere: "Open the board on this device",
    footnote: (kind: BoardKind) =>
      `The code works until you stop the board, and for six hours after ${eventName(kind)} ends. Anyone with it can only watch.`,
    startFailed: "The board could not be started. Try again.",
    retry: "Try again",
  },
  card: {
    title: "On TV now",
    waitingTitle: "Live board is on",
    waiting: (code: string) => `No TV connected yet. Code ${code}.`,
    showing: (tv: string, screen: string, rotating: boolean) =>
      `${tv}. Showing ${screen}, ${rotating ? "rotating" : "held"}.`,
    showingOne: (tv: string) => `${tv}. Showing the scoreboard.`,
    showingWaiting: (tv: string) =>
      `${tv}. Waiting for the first round to be posted.`,
    showingFinal: (tv: string) =>
      `${tv}. Showing the winners and the final table.`,
    tvCount: (count: number) =>
      plural("en", count, { one: "1 TV", other: "{n} TVs" }),
    control: "Control",
  },
  control: {
    chip: "Organizer",
    title: "Live board",
    lead: "What you change here shows on the TV within a few seconds.",
    onTvs: (count: number) =>
      plural("en", count, {
        zero: "Not on a TV yet",
        one: "On 1 TV",
        other: "On {n} TVs",
      }),
    now: "On the TV now",
    thenIn: (screen: string, seconds: number) =>
      `Then ${screen}, in ${seconds} s`,
    held: "Held on this screen",
    oneScreen: "One screen, no rotation",
    waitingNow: "Waiting for the rounds",
    waitingLine: "It starts rotating once a round is posted",
    finalNow: "Final table",
    finalLine: "Stopped on the winners and the final table",
    nextNotPosted: "Shows once the next round is posted",
    screensTitle: "Screens",
    screensHint: "Tap one to show it",
    screenHints: {
      on_court: "Live scores, standings, next round",
      table: "The full table, courts at the side",
      next_up: "Who plays whom, on which court",
    },
    onNow: "On now",
    show: "Show",
    showScreen: (screen: string) => `Show ${screen} on the TV`,
    rotationTitle: "Rotation",
    rotationOn: "On",
    rotationHeld: "Held",
    changeEvery: "Change every",
    perScreen: "Per screen",
    seconds: (count: number) => `${count} s`,
    secondsLabel: (count: number) =>
      plural("en", count, { one: "1 second", other: "{n} seconds" }),
    clockTitle: "Round clock",
    clockState: {
      schedule: "On schedule",
      left: "Running",
      paused: "Paused",
      ready: "Not started",
    },
    clockNone: "no time posted",
    startRound: (round: number) => `Start round ${round}`,
    pauseClock: "Pause",
    resumeClock: "Resume",
    restartClock: "Start again",
    restartTitle: (round: number) => `Start round ${round} again?`,
    restartBody:
      "The clock goes back to the full round on every TV. Scores are not touched.",
    restartKeep: "Keep the clock",
    followSchedule: "Follow the schedule",
    followScheduleHint: "Off, each round waits for you to start it",
    clockNote:
      "The clock is for the TV. Match times and scores are not touched.",
    messageTitle: "Message to the room",
    messageOff: "Not showing",
    messageOn: "On the board now",
    messageLabel: "Message",
    messagePlaceholder: "Round 5 starts in 2 minutes. Check your court.",
    messageEmpty: "Write one line for the room.",
    messageEdit: "Edit",
    messageSave: "Save",
    messageShow: "Show on the board",
    messageTakeDown: "Take it down",
    displayTitle: "Display",
    tvsTitle: "TVs",
    tvsConnected: (count: number) =>
      plural("en", count, {
        zero: "None connected",
        one: "1 connected",
        other: "{n} connected",
      }),
    tvSince: (time: string) => `Connected since ${time}`,
    disconnect: "Disconnect",
    disconnectTv: (name: string) => `Disconnect ${name}`,
    addTv: "Add another TV",
    addFirstTv: "Connect a TV",
    addLine: (address: string, code: string) => `${address}, code ${code}`,
    stop: "Stop the board",
    stopNote: "Closes it on every TV. The game itself is not touched.",
    stopTitle: "Stop the board?",
    stopBody:
      "It closes on every TV and the code stops working. The game is not affected.",
    stopKeep: "Keep it on",
    stopped: "Board stopped",
    offTitle: "The board is not on",
    offLead: "Show on TV starts it and gives you a code for the TV.",
    unavailable: "This game has no live board.",
  },
  tv: {
    title: "Live board",
    lead: "Enter the six-digit code from the organizer’s phone.",
    codeLabel: "Board code",
    nameLabel: "Name this TV (optional)",
    namePlaceholder: "Clubhouse TV",
    open: "Open the board",
    opening: "Opening the board",
    invalid: "Enter the six digits of the code.",
    notFound: "No board is on with that code. Check it with the organizer.",
    failed: "The board could not be opened. Try again.",
    defaultName: (number: number) => `TV ${number}`,
    ended: {
      stopped: "The board was stopped",
      disconnected: "This TV was disconnected",
      closed: "The board has closed",
    },
    endedLead: "Enter a code to open another board.",
    offline: "Reconnecting",
  },
  board: {
    live: "Live",
    final: "Final",
    soon: "Soon",
    paused: "Paused",
    court: (number: number) => `Court ${number}`,
    round: (round: number) => `Round ${round}`,
    clockLeft: "left in the round",
    clockStarts: (round: number) => `to round ${round}`,
    clockPaused: "left, clock paused",
    clockReady: (round: number) => `round ${round} not started`,
    matchTime: "match time",
    minutesPlayed: "minutes played",
    onCourtNow: "On court now",
    roundStarted: (round: number, time: string) =>
      `Round ${round}, started ${time}`,
    roundStarts: (round: number, time: string) =>
      `Round ${round}, starts ${time}`,
    state: {
      scheduled: (time: string) => `Starts ${time}`,
      scheduledNoTime: "Up next",
      on_court: "No score yet",
      awaiting_confirmation: "In play",
      confirmed: "Final",
      not_finished: "Not finished",
      cancelled: "Cancelled",
    },
    standings: "Standings",
    standingsOf: (group: string) => `Standings, ${group}`,
    afterRound: (round: number, total: number): string =>
      round === 0 ? "no round played yet" : `after round ${round} of ${total}`,
    afterRoundShort: (round: number): string =>
      round === 0 ? "no round played yet" : `after round ${round}`,
    pointsRule: (win: number, draw: number, loss: number) =>
      `Win ${win}, draw ${draw}, loss ${loss}`,
    gamesRule: "Ranked on games won",
    afterWithRule: (after: string, rule: string) => `${after}. ${rule}`,
    columns: {
      rank: "#",
      team: "Team",
      player: "Player",
      played: "P",
      won: "W",
      drawn: "D",
      lost: "L",
      games: "Games",
      difference: "+/−",
      points: "Pts",
      gamesWon: "Won",
      rounds: "Rounds",
    },
    next: (time: string | null): string => (time ? `Next, ${time}` : "Next"),
    then: (time: string | null): string => (time ? `Then, ${time}` : "Then"),
    notPosted: "Not posted yet",
    lastRound: "Last round",
    lastRoundLine: "No round after this one",
    nextUp: (round: number) => `Next up, round ${round}`,
    nextUpMeta: (time: string | null, minutes: number): string =>
      time ? `starts ${time}, ${minutes} minutes` : `${minutes} minutes`,
    against: "against",
    placePoints: (place: number, count: number) =>
      `${ordinal(place)}, ${plural("en", count, { one: "1 pt", other: "{n} pts" })}`,
    placeGames: (place: number, count: number) =>
      `${ordinal(place)}, ${plural("en", count, { one: "1 game", other: "{n} games" })}`,
    followOn: "Follow on",
    followPhone: "your phone",
    resultsIn: "Results",
    resultsTemba: "in Temba",
    fromOrganizer: "From the organizer",
    finalTitle: (name: string) => `${name}, final`,
    finished: (time: string) => `Finished ${time}`,
    winners: "Winners",
    winner: "Winner",
    firstOf: (count: number) => `1st of ${count}`,
    winnerSummary: (
      count: number,
      won: number,
      drawn: number,
      lost: number,
      difference: number,
    ) =>
      `${points(count)}. ${record(won, drawn, lost)}, ${signed(difference)} games`,
    placeSummary: (count: number, won: number, drawn: number, lost: number) =>
      `${points(count)}. ${record(won, drawn, lost)}`,
    winnerGamesSummary: (
      gamesWon: number,
      won: number,
      drawn: number,
      lost: number,
    ) =>
      `${plural("en", gamesWon, { one: "1 game won", other: "{n} games won" })}. ${record(won, drawn, lost)}`,
    finalStandings: "Final standings",
    roundsGames: (rounds: number, games: number) =>
      `${plural("en", rounds, { one: "1 round", other: "{n} rounds" })}, ${plural("en", games, { one: "1 game", other: "{n} games" })}`,
    waitingRounds: "The rounds are not posted yet",
    waitingTeams: "The teams are not posted yet",
    waitingStart: "Not started yet",
    startsAt: (day: string, time: string) => `Starts ${day}, ${time}`,
    sets: "Sets",
    set: (number: number) => `Set ${number}`,
    setInPlay: (number: number) => `Set ${number}, in play`,
    setInPlayStatus: (number: number) => `Set ${number} in play`,
    noSets: "No set saved yet",
    setsSaved: (count: number) =>
      plural("en", count, { one: "1 set", other: "{n} sets" }),
    facts: {
      court: "Court",
      pitch: "Pitch",
      started: "Started",
      starts: "Starts",
      venue: "Venue",
      group: "Group",
      kickOff: "Kick-off",
      game: "Game",
      mvp: "MVP",
    },
    noCourt: "Not set",
    levelValue: {
      temba: "Counts for Temba Level",
      group: "Counts for Group Level",
      unrated: "Unrated",
    },
    kickedOff: (time: string) => `Kicked off ${time}`,
    kicksOff: (time: string) => `Kicks off ${time}`,
    kickOffValue: (time: string, minutes: number) =>
      `${time}, ${minutes} minutes`,
    gameValue: (sideSize: string, squad: number) =>
      `${sideSize}, ${squad} a squad`,
    mvpAfter: "After the game",
    roles: {
      gk: "GK",
      def: "DEF",
      mid: "MID",
      fwd: "FWD",
    },
    scorerGoals: (goals: number) => String(goals),
  },
  errors: {
    notFound: "No live board is on for this game.",
    unavailable: "This game has no live board.",
    closed: "This game has ended, so its board cannot be shown.",
    codesExhausted: "A board code could not be made. Try again.",
    messageTooLong: (max: number) =>
      `Keep the message to ${max} characters or fewer.`,
    rotateSeconds: "Pick 5, 10 or 20 seconds.",
    noScreens: "This board has one screen.",
    noRoundClock: "There is no round on the board to run a clock for.",
    roundMovedOn: (round: number) =>
      `The board has moved on to round ${round}. Check the clock and try again.`,
    tvNotFound: "That TV is no longer connected.",
  },
};
