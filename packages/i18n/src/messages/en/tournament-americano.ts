import { plural } from "../../plural";
import { tournamentRounds } from "./tournament-rounds";

const { ordinal } = tournamentRounds.shareCard;
const placeWord = tournamentRounds.finished.place;

const players = (n: number) =>
  plural("en", n, { one: "1 player", other: "{n} players" });
const rounds = (n: number) =>
  plural("en", n, { one: "1 round", other: "{n} rounds" });
const games = (n: number) =>
  plural("en", n, { one: "1 game", other: "{n} games" });
const courts = (n: number) =>
  plural("en", n, { one: "1 court", other: "{n} courts" });
const partners = (n: number) =>
  plural("en", n, { one: "1 partner", other: "{n} partners" });
const wins = (n: number) =>
  plural("en", n, { one: "1 win", other: "{n} wins" });
const draws = (n: number) =>
  plural("en", n, { one: "1 draw", other: "{n} draws" });
const losses = (n: number) =>
  plural("en", n, { one: "1 loss", other: "{n} losses" });

function record(won: number, drawn: number, lost: number) {
  return [wins(won), drawn > 0 ? draws(drawn) : null, losses(lost)]
    .filter(Boolean)
    .join(", ");
}

export const tournamentAmericano = {
  chip: "Americano",
  shape: {
    title: "Americano",
    description: "Sign up alone, a new partner every round",
  },
  create: {
    players: "Players",
    playersUnit: (n: number) =>
      plural("en", n, { one: "player", other: "players" }),
    fewerPlayers: "Fewer players",
    morePlayers: "More players",
    playersHelp: (courtCount: number) =>
      `Alone, in fours. ${courts(courtCount)}, nobody sits out.`,
    rounds: "Rounds",
    roundsUnit: (n: number) =>
      plural("en", n, { one: "round", other: "rounds" }),
    fewerRounds: "Fewer rounds",
    moreRounds: "More rounds",
    roundsHelp: (roundCount: number, max: number) =>
      `${partners(roundCount)} each. ${max} is everyone with everyone.`,
    headerPlayers: (n: number) =>
      plural("en", n, { one: "player", other: "players" }),
    headerGames: games,
    summaryTitle: (gameCount: number, start: string, finish: string) =>
      `${games(gameCount)}, ${start} to ${finish}`,
    summaryCopy: (
      roundCount: number,
      courtCount: number,
      matchMinutes: number,
    ) =>
      `${rounds(roundCount)} of ${games(courtCount)} on ${courts(courtCount)}, ${matchMinutes} minutes a game, back to back. One table of players at the end, ranked on games won.`,
    noCourts: "Record at least one Court in step 2: the rounds are laid out on the Courts.",
    waitsForCourts: (recorded: number, needed: number) =>
      `${courts(recorded)} recorded for ${games(needed)} a round, so some games wait for a free court.`,
    finishTooLate:
      "The rounds run past the last finish time of the day. Pick an earlier start, fewer rounds or shorter games.",
    reviewFormat: (roundCount: number) => `Americano, ${rounds(roundCount)}`,
    reviewPlayers: (n: number) => `${players(n)}, alone`,
    pricePerPlayer: (price: string) =>
      `Each player pays their own ${price} BD, since nobody enters as a team.`,
    levelCopy:
      "An Americano does not change anyone’s Level, so mixed levels are fine.",
    rating: "Rating",
    ratingValue: "Friendly, no change",
  },
  hero: {
    players: "players, alone",
    rounds: (matchMinutes: number) => `rounds of ${matchMinutes} min`,
    perPlayer: (currency: string) => `${currency} per player`,
    entry: "entry",
    seats: (taken: number, total: number) => `${taken} of ${total} seats`,
    seatsFull: "full, ready for rounds",
    seatsOpen: "rounds are made when full",
    courtsLine: (courtCount: number) =>
      courtCount === 1 ? "Court 1" : `Courts 1 to ${courtCount}`,
  },
  drawEntry: {
    allIn: (n: number) => `All ${n} in. Make the rounds`,
    someIn: (n: number, total: number) =>
      `${n} of ${total} in. Make the rounds`,
    copy: "A new partner every round.",
    open: "Make rounds",
    waitingTitle: "The rounds",
    waitingCopy: (total: number) =>
      `Made when all ${total} seats are taken. You get a new partner every round, so you only sign up yourself.`,
  },
  players: {
    title: "Players",
    count: (taken: number, total: number) => `${taken} of ${total}`,
    openSeat: "Open seat",
    footOrganizer:
      "Everyone signed up alone. There are no teams to form: partners change every round.",
    footPlayer:
      "No team and no side to pick. Take a seat and Temba gives you a partner for each round.",
    remove: (name: string) => `Remove ${name}`,
  },
  schedule: {
    title: "Schedule",
    meta: "partners after the draw",
    roundShort: (n: number) => `R${n}`,
    copy: (roundCount: number, matchMinutes: number, courtCount: number) =>
      `${rounds(roundCount)} of ${matchMinutes}-minute games, ${courts(courtCount)} at once, a new partner every round. The player with the most games won wins the day.`,
  },
  join: {
    seatsLeft: (n: number) =>
      n <= 0
        ? "No seats left"
        : plural("en", n, { one: "1 seat left", other: "{n} seats left" }),
    copy: "Sign up alone.",
    copyWithPrice: (price: string) => `Sign up alone. ${price} BD per player`,
    takeSeat: "Take a seat",
    taking: "Taking a seat…",
    joinWaitlist: "Join the waitlist",
    leave: "Leave the seat",
  },
  details: {
    organizer: "Organizer",
    group: "Group",
    format: "Format",
    formatValue: (roundCount: number) => `Americano, ${rounds(roundCount)}`,
    scores: "Scores",
    scoresValue: "Either pair enters, the other confirms",
    rating: "Counts for rating",
    ratingValue: "No, it’s friendly",
  },
  draw: {
    title: "The rounds",
    lead: (playerCount: number, roundCount: number, gameCount: number) =>
      `${players(playerCount)}, ${rounds(roundCount)}, ${games(gameCount)}. Everyone gets ${partners(roundCount)}, all different. This is round 1: tap two players to swap them.`,
    round: (n: number) => `Round ${n}`,
    of: (total: number) => `of ${total}`,
    when: (time: string, courtsLine: string) => `${time}, ${courtsLine}`,
    court: (n: number) => `Court ${n}`,
    vs: "vs",
    make: (roundCount: number) =>
      roundCount === 1 ? "Make the round" : `Make all ${roundCount} rounds`,
    making: "Making the rounds…",
    shuffle: "Shuffle again",
    foot: "Making the rounds closes the seats. You can still swap players in any round that has not started.",
    notInFours: (n: number) =>
      `${players(n)} are in. The rounds need players in fours, so take a player off or wait for more.`,
    belowMinimum: (min: number) =>
      `At least ${players(min)} are needed to make the rounds.`,
    fewerRounds: (roundCount: number, planned: number) =>
      `With this many players, ${rounds(roundCount)} is everyone with everyone, so you get ${roundCount} of the ${planned} planned.`,
    posted: "Rounds made. Every player sees their partners.",
    selected: (name: string) => `${name}, picked to swap`,
  },
  tabs: {
    label: "Americano sections",
    players: "Players",
    rounds: "Rounds",
    standings: "Standings",
  },
  lead: {
    players: "Everyone signed up alone. Partners change every round.",
    rounds:
      "Either pair enters the score; the other confirms. Organizers can enter or fix any game.",
    roundsOrganizer: (roundCount: number) =>
      `${rounds(roundCount)} made. Everyone gets ${partners(roundCount)}, all different. You can enter or fix any score, and swap players in a round that hasn’t started.`,
    standings:
      "One table of players, ranked on games won. Every game your pair wins counts for both of you.",
  },
  progress: {
    roundOnCourt: (n: number, total: number) => `Round ${n} of ${total}`,
    onCourt: "on court",
    played: (n: number) => `${n} played`,
    allPlayed: "all played",
  },
  yourGame: {
    onCourt: (n: number, total: number) =>
      `Round ${n} of ${total}, on court now`,
    next: (n: number, total: number) => `Round ${n} of ${total}, next`,
    you: (partner: string) => `You & ${partner}`,
    against: "against",
  },
  round: {
    title: (n: number) => `Round ${n}`,
    short: (n: number) => `R${n}`,
    onCourt: (time: string, scored: number, total: number) =>
      `${time}, on court. ${scored} of ${total} in`,
    played: (time: string) => `${time}, played`,
    next: (time: string) => `${time}, next`,
    later: (time: string, gameCount: number) => `${time}, ${games(gameCount)}`,
    enterScore: "Enter score",
    fixScore: "Fix score",
    confirm: "Confirm",
    toConfirm: "to confirm",
    onCourtNow: "on court",
    notFinished: "didn’t finish",
    swap: "Swap players",
    swapDone: "Done",
    swapHint: (n: number) =>
      `Round ${n}: tap two players to swap them. Nobody may get the same partner twice.`,
    swapped: "Players swapped.",
    swapFoot:
      "To swap, open a round and tap two players. Temba keeps the rule: nobody gets the same partner twice.",
  },
  score: {
    gamesEach: (pair: string, gamesWon: number) =>
      `${games(gamesWon)} each for ${pair}`,
    otherGets: (pair: string, gamesWon: number) =>
      `${pair} get ${gamesWon} each. Games won is what ranks you, win or lose.`,
  },
  table: {
    place: "#",
    player: "Player",
    played: "P",
    difference: "+/−",
    gamesWon: "GW",
    you: "(you)",
    live: "GW is games won, +/− is games won minus games lost. Ties: game difference, then matches won.",
    final: "Final. Ranked on games won, then game difference.",
    empty: "No scores yet. The table fills as games are confirmed.",
  },
  yourRounds: {
    title: "Your rounds",
    meta: (gameCount: number) => `${games(gameCount)}, ${partners(gameCount)}`,
    finishedTitle: "Your games",
    finishedMeta: (gamesFor: number, gamesAgainst: number) =>
      `${gamesFor} games for, ${gamesAgainst} against`,
    with: (name: string) => `With ${name}`,
    versus: (names: string) => `v ${names}`,
    won: (n: number) => `Round ${n}, won`,
    drawn: (n: number) => `Round ${n}, drawn`,
    lost: (n: number) => `Round ${n}, lost`,
    onCourt: (n: number, court: string) => `Round ${n}, on court, ${court}`,
    upcoming: (n: number) => `Round ${n}`,
    when: (time: string, court: string) => `${time}, ${court}`,
  },
  finished: {
    eyebrow: (date: string) => `Finished, ${date}`,
    sub: (
      venue: string | null,
      playerCount: number,
      roundCount: number,
      group: string | null,
    ) =>
      [venue, `${players(playerCount)}, ${rounds(roundCount)}`, group]
        .filter(Boolean)
        .join(". "),
    wonTheDay: "Won the day",
    winnerLine: (gamesWon: number, won: number, drawn: number, lost: number) =>
      `${gamesWon} games won. ${record(won, drawn, lost)}`,
    you: "You",
    yourPlace: (place: number, gamesWon: number) =>
      `${placeWord(place)}, ${gamesWon} games won`,
    yourRecord: (won: number, drawn: number, lost: number, behind: number) =>
      behind > 0
        ? `${record(won, drawn, lost)}. ${games(behind)} behind`
        : record(won, drawn, lost),
    share: "Share your day",
  },
  played: {
    finished: (place: number, of: number) =>
      `Finished ${ordinal(place)} of ${of}`,
    toCome: "Results to come",
    sub: (
      venue: string | null,
      playerCount: number,
      roundCount: number,
      matchMinutes: number,
    ) =>
      [
        venue,
        `${players(playerCount)}, ${rounds(roundCount)} of ${matchMinutes} min`,
      ]
        .filter(Boolean)
        .join(". "),
    you: "You",
    youLine: (gamesWon: number, partnerCount: number) =>
      `${gamesWon} games won, ${partners(partnerCount)}`,
    wonBy: (name: string, gamesWon: number) =>
      `Won by ${name}, ${games(gamesWon)}`,
    standings: "Standings",
  },
  share: {
    ofPlayers: (n: number) => `of ${players(n)}`,
    record: (gamesWon: number, won: number, drawn: number, lost: number) =>
      `${gamesWon} games won. ${record(won, drawn, lost)}`,
    gamesWon: (n: number) => `${n} GW`,
  },
  mobile: {
    webOnly:
      "Making the rounds, swapping players and entering scores happen on the web for now.",
  },
  errors: {
    players: (min: number, max: number) =>
      `An Americano has ${min} to ${max} players, in fours.`,
    rounds: (max: number) => `Pick 1 to ${max} rounds.`,
    notAmericano: "This Social is not an Americano.",
    cancelled: "This Social is cancelled.",
    roundsMade: "The rounds are already made.",
    notInFours: (n: number) =>
      `${players(n)} are in. The rounds need players in fours.`,
    belowMinimum: (min: number) =>
      `At least ${players(min)} are needed to make the rounds.`,
    wrongPlayers:
      "The players changed while you were making the rounds. Open the sheet again.",
    noRounds: "The rounds are not made yet.",
    roundNotFound: "That round is not on this Social.",
    roundStarted:
      "That round has a score. Swap players in a round that has not started.",
    samePlayer: "Pick two different players to swap.",
    playerNotInRound: "Both players must be playing in that round.",
    repeatsPartner: (first: string, second: string) =>
      `That swap pairs ${first} and ${second} a second time. Nobody may get the same partner twice.`,
    kickAfterRounds:
      "The rounds are made, so every player is in every round. Swap players in a round instead.",
    useMakeRounds:
      "An Americano makes its rounds from the players. Use Make rounds.",
    recordCourts:
      "Record at least one Court on this Social before making the rounds.",
    courtsRequired:
      "Record at least one Court: the rounds are laid out on the Courts.",
    windowTooShort: (finish: string) =>
      `The rounds need until ${finish}. Move the finish later, record more Courts or play fewer rounds.`,
    roundsOverrun:
      "The rounds run past the end of this Social. Record more Courts or move the finish later.",
  },
};
