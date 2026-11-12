import { plural } from "../../plural";

const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
  "ten",
];

function countWord(n: number) {
  return NUMBER_WORDS[n] ?? String(n);
}

function capitalized(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function teamChanges(n: number) {
  return plural("en", n, {
    one: `${countWord(n)} player changes team`,
    other: `${countWord(n)} players change team`,
  });
}

function sideChanges(n: number, alone: boolean) {
  if (alone) {
    return plural("en", n, {
      one: `${countWord(n)} player changes side`,
      other: `${countWord(n)} players change side`,
    });
  }
  return plural("en", n, {
    one: `${countWord(n)} changes side`,
    other: `${countWord(n)} change side`,
  });
}

export const editTeams = {
  action: "Edit teams",
  gameMenuHint: "Move players between sides and teams",
  tournamentMenuHint: "Change pairs and sides",
  title: "Edit teams",
  gameInstructions:
    "Tap a player, then tap where they should go. Same team changes their side; across the net changes their team.",
  tournamentInstructions:
    "Tap a player, then tap another to swap them. Same team swaps their sides; different teams swaps their teams.",
  swapSides: "Swap sides",
  swapSidesOf: (team: string) => `Swap sides in ${team}`,
  net: "net",
  open: "Open",
  moveHere: "Move here",
  left: "left",
  right: "right",
  spot: (team: string, side: string) => `${team}, ${side}`,
  playerSr: (name: string, spot: string) => `${name}, ${spot}`,
  openSr: (spot: string) => `${spot}, open`,
  pickHint: "Picks this player to move",
  dropHint: "Moves the picked player here",
  cancelHint: "Cancels the pick",
  moved: "moved",
  lockedTag: "played",
  lockedTitle: "Results are in",
  lockedCopy:
    "A result belongs to the team that played it, so those teams stay together. You can still swap their sides.",
  untilScore: "Allowed until the score goes in.",
  roundsKeepSlots: "Rounds keep their teams; only the names change.",
  reset: "Reset",
  noChangesTitle: "No changes yet",
  noChangesGame: "The line-up is as the players set it",
  noChangesTournament: "Teams are as they signed up",
  changesTitle: (n: number) =>
    plural("en", n, { one: "1 change", other: "{n} changes" }),
  changesSubline: "Nothing changes until you save",
  save: "Save",
  confirmTitle: "Save new teams?",
  summary: (teamChangeCount: number, sideChangeCount: number) => {
    if (teamChangeCount > 0 && sideChangeCount > 0) {
      return `${capitalized(teamChanges(teamChangeCount))} and ${sideChanges(sideChangeCount, false)}.`;
    }
    if (teamChangeCount > 0) {
      return `${capitalized(teamChanges(teamChangeCount))}.`;
    }
    return `${capitalized(sideChanges(sideChangeCount, true))}.`;
  },
  movedLine: (from: string, to: string) => `${from} to ${to}`,
  notifyTitle: "Tell the players",
  notifyCopy: (names: string, count: number) =>
    plural("en", count, {
      one: `${names} gets a notification with their new place`,
      other: `${names} get a notification with their new place`,
    }),
  notifyNobody: "Only your own place changes, so nobody else is told.",
  keepEditing: "Keep editing",
  saveTeams: "Save teams",
  savedToast: "Teams saved",
  tournamentCardCopy:
    "Swap players between teams or sides. Teams that have played stay together.",
  refused: {
    locked:
      "This team has played, so it stays together. You can still swap its sides.",
    halfSide: "Every team on this tournament needs two players.",
    fixedSides:
      "Once the draw is posted, swap players instead of moving them to an open spot.",
  },
  openSpot: {
    title: (spot: string) => `${spot} is open`,
    addPlayer: "Add a player here",
    addPlayerHint: "Seat someone yourself, from the group or by phone",
    join: "Take this spot yourself",
    move: "Move here yourself",
    firstGoesTo: (team: string) =>
      `The first player you pick goes to ${team}. The rest fill the next open spots.`,
  },
  errors: {
    format: "Teams can be edited on padel games and friendly tournaments",
    scoreIn: "The score is in, so the teams are fixed",
    lineupChanged:
      "Someone joined or left while you were editing. Check the teams and try again.",
    spotTwice: "Two players can't share a spot",
  },
};
