import { plural } from "../../plural";

const PLACE_WORDS = [
  "First",
  "Second",
  "Third",
  "Fourth",
  "Fifth",
  "Sixth",
  "Seventh",
  "Eighth",
  "Ninth",
  "Tenth",
  "Eleventh",
  "Twelfth",
];

function ordinal(place: number) {
  const mod100 = place % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${place}th`;
  }
  const suffix = ["th", "st", "nd", "rd"][place % 10] ?? "th";
  return `${place}${suffix}`;
}

const teams = (n: number) =>
  plural("en", n, { one: "1 team", other: "{n} teams" });
const courts = (n: number) =>
  plural("en", n, { one: "1 court", other: "{n} courts" });
const players = (n: number) =>
  plural("en", n, { one: "1 player", other: "{n} players" });

export const tournamentKing = {
  shape: {
    title: "King of the court",
    description: "Winners move up a court, losers move down",
  },
  formatName: "king of the court",
  create: {
    courts: "Courts",
    courtsMax: (max: number) => `Max ${max}`,
    courtsUnit: (n: number) =>
      plural("en", n, { one: "court", other: "courts" }),
    fewerCourts: "Fewer courts",
    moreCourts: "More courts",
    courtsHelp: (courtCount: number, teamCount: number) =>
      `Two teams start on every court, so ${courts(courtCount)} is ${teams(teamCount)}. Winners move up a court, losers move down, and Court 1 is the king’s court. This replaces the team count from step 2.`,
    teamsLabel: "teams",
    courtsLabel: courts,
    playTime: "Play time",
    setPlayTime: "Set",
    hoursMinutes: (hours: number, minutes: number) =>
      minutes === 0 ? `${hours} h` : `${hours} h ${minutes}`,
    summaryTitle: (teamCount: number, start: string, finish: string) =>
      `${teams(teamCount)}, ${start} to ${finish}`,
    summaryCopy: (courtCount: number, duration: string) =>
      `${courts(courtCount)} for ${duration}. Temba draws which teams start on which court. When it ends you name the final order: first, second, third and so on. No rounds to make and no scores to enter.`,
    reviewFormat: (courtCount: number) =>
      `King of the court, ${courts(courtCount)}`,
    reviewRating: "Rating",
    reviewRatingValue: "Friendly, no change",
  },
  court: {
    name: (court: number) => `Court ${court}`,
    kings: "King’s court",
    bottom: "bottom court",
    yours: "your court",
  },
  howItRuns: {
    title: "How it runs",
    meta: "king of the court",
    up: "Win, move up a court",
    down: "Lose, move down",
    copy: "Two teams start on each court. Whoever holds Court 1 at the end is king of the court. No rounds to make and no scores to enter: you post the final order when it’s over.",
  },
  hero: {
    statusSeated:
      "You are in. The starting courts are drawn once every seat is taken.",
    statusUnseated: (seatsLeft: number, organizerFirstName: string | null) => {
      const seats =
        seatsLeft <= 0
          ? "No seats left."
          : plural("en", seatsLeft, {
              one: "1 seat left.",
              other: "{n} seats left.",
            });
      const drawer = organizerFirstName
        ? `${organizerFirstName} draws the starting courts once they are full`
        : "The starting courts are drawn once they are full";
      return `${seats} ${drawer}.`;
    },
    teams: "teams, two a court",
    courts: "courts, 1 is king",
    courtsLine: (courtCount: number) =>
      courtCount === 1 ? "Court 1" : `Courts 1 to ${courtCount}`,
  },
  drawEntry: {
    allIn: (playerCount: number) => `All ${playerCount} in. Draw the courts`,
    someIn: (complete: number, total: number) =>
      `${complete} of ${teams(total)} complete. Draw the courts`,
    copy: "Which team starts on which court. It’s the only draw there is.",
    open: "Open the draw",
  },
  draw: {
    title: "Starting courts",
    close: "Close",
    note: (teamCount: number, courtCount: number) =>
      `${teams(teamCount)} on ${courts(courtCount)}, drawn at random. Tap two teams to swap them.`,
    swapWith: (names: string) => `Now tap the team to swap with ${names}.`,
    postedNote: "Posted. Every player sees the court they start on.",
    swapTag: "swap with",
    swapLabel: (names: string) => `Swap ${names}`,
    post: "Post the starting courts",
    posting: "Posting…",
    again: "Draw again",
    footer: "Posting closes the seats and tells every player their court.",
    posted: "Posted",
    postedCopy: (playerCount: number) =>
      `All ${players(playerCount)} see where they start`,
    change: "Change",
    changeLocked: "The final order is posted, so the starting courts are set.",
  },
  tabs: {
    label: "Tournament sections",
    teams: "Teams",
    courts: "Courts",
    finalOrder: "Final order",
  },
  lead: {
    teams: "Every team in the draw, two to a court.",
    courts:
      "Winners move up a court, losers move down. Whoever holds Court 1 at the end is king of the court.",
    finalOrderEmpty: "Final order is empty until the organizer posts it.",
    finalOrderOrganizer:
      "It’s over. Tap the teams in the order they finished: the first tap is 1st, the next is 2nd, and so on.",
    finalOrderNotYet:
      "When it ends, tap the teams in the order they finished and post it here.",
    finalOrderPosted: "Final. Set by the organizer when it ended.",
  },
  yourCourt: {
    startOn: (team: string) => `${team} start on`,
    youStartOn: "You start on",
    against: "against",
    winUp: "Win and you move up to",
    winStay: "Win and you stay on",
    loseDown: "Lose and you move down to",
    loseStay: "Lose and you stay on",
  },
  startingCourts: {
    changeCourts: "Change starting courts",
    title: "Starting courts",
    meta: "first round only",
    footer:
      "After the first round teams move between courts on the day. The final order is posted on the Final order tab when it ends.",
    bye: "No team drawn here",
  },
  finalOrder: {
    title: "Final order",
    placed: (placed: number, total: number) => `${placed} of ${total} placed`,
    nobody: "Nobody placed yet. Tap the winners below.",
    king: "King of the court",
    moveUp: (team: string) => `Move ${team} up`,
    takeOut: (team: string) => `Take ${team} out`,
    place: (team: string) => `Place ${team}`,
    stillToPlace: "Still to place",
    nextTap: (place: number) => `next tap is ${ordinal(place)}`,
    unplaced: (n: number) =>
      plural("en", n, {
        one: "1 team is shown to players as not placed.",
        other: "{n} teams are shown to players as not placed.",
      }),
    clear: "Clear",
    post: "Post the final order",
    posting: "Posting…",
    placeTop: (min: number) => `Place the top ${min} to post`,
    posted: "Final order posted",
    postedCanChange: "Every player sees it. 24 hours to change it",
    postedFinal: "Every player sees it.",
    change: "Change",
    notPlaced: "Not placed",
    numberHeader: "#",
    teamHeader: "Team",
    note: "Final. Set by the organizer when it ended.",
    tableLabel: "Final order",
  },
  finished: {
    dateLine: (day: string) => `Finished, ${day}`,
    summary: (venue: string | null, teamCount: number, courtCount: number) => {
      const size = `${teams(teamCount)}, ${courts(courtCount)}, king of the court`;
      return venue ? `${venue}. ${size}` : size;
    },
    podiumLabel: "King of the court and your place",
    kingSmall: "King of the court",
    heldCourtOne: "Held Court 1 at the end",
    placeOf: (place: number, teamCount: number) =>
      `${PLACE_WORDS[place - 1] ?? ordinal(place)} of ${teamCount}`,
    notPlaced: "Not placed",
    startedOn: (court: number) => `Started on Court ${court}`,
    you: (partner: string | null) => (partner ? `You & ${partner}` : "You"),
  },
  card: {
    teamsCourts: (teamCount: number, courtCount: number) =>
      `${teams(teamCount)} on ${courts(courtCount)}`,
    finishedPlace: (place: number, teamCount: number) =>
      `Finished ${ordinal(place)} of ${teamCount}`,
    notPlaced: (teamCount: number) => `Not placed of ${teamCount}`,
    toCome: "Final order to come",
    kingOfTheCourt: "King of the court:",
    finalOrder: "Final order",
    startedOn: (court: number) => `Started on Court ${court}`,
  },
  details: {
    scores: "Scores",
    scoresNone: "None, the organizer posts the order",
    scoresPosted: "None, the organizer posted the order",
    rating: "Counts for rating",
    ratingNo: "No, nothing is scored",
    ratingFinished: "Not counted, nothing was scored",
  },
  errors: {
    courts: (min: number, max: number) =>
      `King of the court needs ${min} to ${max} courts.`,
    notKing: "This tournament is not King of the court.",
    useStartingCourts: "Draw the starting courts instead.",
    cancelled: "This tournament is cancelled.",
    halfTeams: (names: string) =>
      `These Game teams are missing a partner: ${names}. Merge or remove them first.`,
    belowMinimum: (min: number) =>
      `At least ${teams(min)} must be complete to draw the courts.`,
    wrongTeams: "Draw every complete team onto a court exactly once.",
    finalOrderPosted:
      "The final order is posted, so the starting courts are set.",
    notDrawn: "Post the starting courts first.",
    notStarted: "Post the final order once the tournament has started.",
    placeTop: (min: number) => `Place at least the top ${min} teams.`,
    unknownTeams: "Place only teams from this tournament, each once.",
    changeClosed: "The final order can only be changed for 24 hours.",
  },
};
