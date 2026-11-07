import { plural } from "../../plural";

export const webGame = {
  addPlayer: {
    playsAs: "Role",
    preferredPosition: "Preferred position",
    side: "Side",
    position: "Position",
    adding: "Adding…",
    phone: "Phone number",
    lookingUp: "Looking up…",
    startingLevel: "Starting Level",
  },
  hero: {
    timeUnset: "Time unset",
    youAnd: (name: string) => `You and ${name}`,
  },
  fallbackTitle: "Game",
  directions: "Directions",
  directionsTo: (venue: string) => `Directions to ${venue}`,
  overflow: {
    gameActions: "Game actions",
  },
  joinSheet: {
    seatName: (side: string, position: string) => `${side} ${position}`,
    seatTakenBy: (seat: string, name: string) => `${seat}, taken by ${name}`,
    takeSeat: (seat: string) => `Take ${seat}`,
    versus: "vs",
    teams: "Teams",
    allTeams: "All teams",
    joinSeatButton: (side: string, position: string) =>
      `Join ${side}, ${position} seat`,
    registeredToast: "Registered",
    seatJoinFailed: "Couldn't take that seat. Try again.",
  },
  partnerPicker: {
    playedWithBefore: "Played with before",
    loadingSuggestions: "Loading partner suggestions",
    suggestionsError: "Suggestions could not be loaded",
    searchPlaceholder: "Search Users",
    fromYourGroups: "From your groups",
  },
  partnerReview: {
    stepTwoOfTwo: "Step 2 of 2",
    seatSides: "Seat sides",
  },
  registering: "Registering…",
  seatBlocks: {
    actionsFor: (name: string) => `Actions for ${name}`,
    open: "Open",
    vacant: "Vacant",
  },
  booked: "Booked",
  detailTiles: {
    date: "Date",
    time: "Time",
    levelRange: "Level range",
  },
  loadingGame: "Loading Game",
  header: {
    onGroup: "On Group",
    pickupGame: "Pickup Game",
    public: "Public",
  },
  levelRange: {
    requestApproved: "Request approved",
    requestRejected: "Request rejected",
    requesting: "Requesting…",
    sectionTitle: "Level range requests",
    sectionDescription:
      "Approve grants a waiver without seating them. Reject lets them request again.",
    noPending: "No pending Level range requests.",
  },
  occupancy: {
    teamsToGo: (n: number) =>
      plural("en", n, { one: "1 Team to go", other: "{n} Teams to go" }),
    teams: "Teams",
    onWaitlist: (n: number) =>
      plural("en", n, { one: "1 on waitlist", other: "{n} on waitlist" }),
  },
  overview: {
    rounds: "Rounds",
    roundUnit: (n: number) =>
      plural("en", n, { one: "Round", other: "Rounds" }),
  },
  lineup: {
    title: "Line-up",
    seatLabel: (name: string, subline: string) => `${name}, ${subline}`,
    renameFor: (action: string, name: string) => `${action}: ${name}`,
    kickName: (name: string) => `Kick ${name}`,
  },
  players: {
    pickVacantPosition: "Pick a vacant Position to sit.",
    notSeatedYet: "Not seated yet",
    nobodyRegistered: "Nobody is registered yet",
    waitlist: "Waitlist",
    waitlistEmpty: "Waitlist is empty",
    waitlistEntry: (place: number, name: string) => `${place}. ${name}`,
    joinTheWaitlist: "Join the waitlist",
    gameFullPromote: "The Game is full. You promote into a vacated Position.",
    pickCompleteTeam: "Pick a complete Team",
    registerATeam: "Register a Team",
    needCompleteTeam:
      "You need a complete Team whose both partners are allowed on this Game.",
    team: "Team",
    selectATeam: "Select a Team",
    teamOption: (name: string, members: string) => `${name} (${members})`,
    noVacantSidePickSeat: "No fully vacant side; pick a seat",
    pickVacantSideAndPosition: "Pick a vacant side and your Position",
    joinWaitlistWithPartner: "Join waitlist with a partner",
    registerWithPartner: "Register with a partner",
    waitlistWithPartnerCopy:
      "The Game is full. You both join the waitlist and promote separately.",
    noVacantSideCopy: "No fully vacant side. Pick a vacant Position instead.",
    takeVacantSideCopy:
      "Take one fully vacant side. You pick left or right; your partner gets the other.",
    vacantSide: "Vacant side",
    yourPosition: "Your Position",
    partner: "Partner",
  },
  ratingImpact: {
    title: "Rating impact",
    change: "Change",
    newLevel: "New level",
  },
  seatGrid: {
    moving: "Moving…",
    moveHere: "Move here",
  },
  venueCard: {
    venue: "Venue",
    cityCountry: (city: string, country: string) => `${city}, ${country}`,
    softArchived: "Soft-archived",
  },
  venueSelect: {
    placeholder: "Select a Venue",
    noLiveVenues: "No live Venues.",
    noMatch: "No Venues match.",
  },
  window: {
    pickATime: "Pick a time",
    day: "Day",
    pickADate: "Pick a date",
    startTime: "Start time",
    finishTime: "Finish time",
    descriptionWithFinish:
      "Day, start time, and finish time are required. Pick today or a later day. Times are in 30-minute intervals and a game may run past midnight; for today, only upcoming times are listed.",
    descriptionStartOnly:
      "Day and start time are required. Pick today or a later day. Times are in 30-minute intervals; for today, only upcoming times are listed.",
  },
  hubEmpty: {
    nextGame: "Next Game",
    notScheduled: "Not scheduled",
    createGame: "Create Game",
    findAGroup: "Find a Group",
    recentForm: "Recent form",
    noResultsYet: "No results yet",
  },
  history: {
    linkLabel: (outcome: string, score: string, meta: string) =>
      `${outcome}, ${score}, ${meta}`,
  },
  played: {
    notOnATeam: "Not on a team",
    scoreLabel: (
      aName: string,
      aScore: number,
      bName: string,
      bScore: number,
    ) => `${aName} ${aScore}, ${bName} ${bScore}`,
    confirmed: "CONFIRMED",
    pairRowLabel: (line: string, word: string, sets: string) =>
      `${line}, ${word}. Sets ${sets}`,
    viewProfile: "View profile",
  },
  roundCount: {
    fewer: "Fewer Rounds",
    more: "More Rounds",
  },
  edit: {
    stepLabel: {
      name: "Name",
      window: "When",
      caps: "Players",
      price: "Price",
      level: "Level range",
      rounds: "Rounds",
      season: "Season",
      mvp: "MVP",
    },
    stepFailed: (step: string, message: string) => `${step}: ${message}`,
    movedToWaitlist: (n: number) =>
      plural("en", n, {
        one: "1 player moved to the waiting list",
        other: "{n} players moved to the waiting list",
      }),
    thisGroup: "This group",
    pickDayFirst: "Pick a day first.",
    playersAndPrice: "Players and price",
    fewerPlayers: "Fewer players",
    morePlayers: "More players",
    aside: "A-side",
    smallerSide: "Smaller side",
    biggerSide: "Bigger side",
    pricePerPlayer: "Price per player",
    priceHint: "Price changes apply to players who join from now on.",
    minimumLevel: "Minimum Level",
    maximumLevel: "Maximum Level",
  },
  results: {
    clockRange: (start: string, end: string) => `${start} – ${end}`,
    match: "Match",
    leads: (team: string) => `${team} leads`,
    noResultYet: "No result yet",
    noMatchResults: "No Match results",
    americanoNoMatches: "Americano Games do not have Matches.",
    noSetsYet: "No Sets yet.",
    teams: "Teams",
    scoreSets: "Score sets",
    slotGames: (slot: string) => `${slot} games`,
    scoringOpens: "Scoring opens once both teams are full.",
    court: "Court",
    noCourt: "No Court",
    courtOption: (venue: string, court: string) => `${venue}: ${court}`,
    slotEmpty: (slot: string) => `${slot} empty`,
  },
  score: {
    title: "Score",
    confirmations: "Confirmations",
    confirmScore: "Confirm score",
    confirmResult: "Confirm result",
    boxLabel: (side: string, set: string) => `${side}, ${set}`,
    saveScore: "Save score",
  },
  summary: {
    joinPosition: (position: string) => `Join ${position}`,
    untitledGame: "Untitled Game",
    linkLabel: (title: string, day: string, time: string, meridiem: string) =>
      `${title}, ${day} ${time} ${meridiem}`,
    occupancyPlayers: (occupancy: string) => `${occupancy} players`,
    perPlayer: "per player",
  },
};
