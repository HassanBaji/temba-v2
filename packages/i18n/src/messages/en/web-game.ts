import { plural } from "../../plural";

export const webGame = {
  addPlayer: {
    playsAs: "Plays as",
    preferredPosition: "Preferred position",
    side: "Side",
    position: "Position",
    adding: "Adding…",
    phone: "Phone",
    lookingUp: "Looking up…",
    startingLevel: "Starting Level",
  },
  hero: {
    timeUnset: "Time unset",
    youAnd: (name: string) => `You and ${name}`,
  },
  directions: "Directions",
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
    registering: "Registering…",
  },
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
    roundUnit: (n: number) => plural("en", n, { one: "Round", other: "Rounds" }),
  },
};
