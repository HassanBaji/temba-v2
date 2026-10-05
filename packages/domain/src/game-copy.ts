/**
 * Game action labels, consequence lines and toasts. Sentence case, with the
 * glossary nouns (Game, Match, Set, Team, Level) capitalised as CONTEXT.md
 * writes them. Consequence lines are full sentences and end with a period.
 */

export const JOIN_GAME_ACTION = "Join Game";
export const EDIT_GAME_ACTION = "Edit Game";
export const CANCEL_GAME_ACTION = "Cancel Game";
export const LEAVE_GAME_ACTION = "Leave Game";
export const LEAVE_WAITLIST_ACTION = "Leave waitlist";
export const REGISTER_TEAM_ACTION = "Register Team";
export const CANCEL_MATCH_ACTION = "Cancel Match";
export const COMPLETE_MATCH_ACTION = "Complete Match";
export const MARK_AS_NOT_PLAYED_ACTION = "Mark as not played";
export const REPORT_WRONG_SCORE_ACTION = "Report a wrong score";
export const KICK_ACTION = "Kick";
export const CLOSE_REGISTRATION_ACTION = "Close registration";
export const REOPEN_REGISTRATION_ACTION = "Reopen registration";

export const CANNOT_BE_UNDONE_COPY = "This cannot be undone.";
export const LEAVE_GAME_CONSEQUENCE = "Your spot can open for someone else.";
export const LEAVE_WAITLIST_CONSEQUENCE =
  "You'll lose your place on the Waitlist.";
export const MARK_AS_NOT_PLAYED_CONSEQUENCE =
  "No result is recorded and nobody's Level changes.";
export const REPORT_WRONG_SCORE_CONSEQUENCE =
  "The players are asked to check the score again.";
export const REPORT_WRONG_SCORE_LOCKED_CONSEQUENCE =
  "A later rated Game means this can't be corrected here. Contact support to fix it.";
export const COMPLETE_MATCH_CONSEQUENCE =
  "The score becomes final and each player's rating updates from it.";

/** Who loses the Game from their calendar, counted from the seats taken. */
export function cancelGameConsequence(playerCount: number) {
  if (playerCount <= 0) {
    return "Nobody has joined yet.";
  }
  if (playerCount === 1) {
    return "Removes it from the calendar for 1 player.";
  }
  return `Removes it from the calendar for all ${playerCount} players.`;
}

export function setLabel(setIndex: number) {
  return `Set ${setIndex + 1}`;
}

/** Column heads too narrow for `Set 1`; pair with `setLabel` for the full name. */
export function setShortLabel(setIndex: number) {
  return `S${setIndex + 1}`;
}

export const GAME_TOAST = {
  joined: "Joined Game",
  joinedWaitlist: "Joined waitlist",
  teamRegistered: "Team registered",
  teamJoinedWaitlist: "Team joined waitlist",
  seatChanged: "Seat changed",
  halfTeamsMerged: "Half teams merged",
  poolsDrawn: "Groups drawn",
  poolDrawPosted: "Group draw posted",
  poolDrawUndone: "Group draw undone",
  knockoutDrawn: "Knockout drawn",
  knockoutDrawPosted: "Draw posted",
  knockoutDrawUndone: "Draw undone",
  left: "You left the Game",
  leftWaitlist: "You left the waitlist",
  registrationClosed: "Registration closed",
  registrationReopened: "Registration reopened",
  gameCancelled: "Game cancelled",
  matchCancelled: "Match cancelled",
} as const;

export function gameJoinToast(waitlisted: boolean) {
  return waitlisted ? GAME_TOAST.joinedWaitlist : GAME_TOAST.joined;
}

export function teamRegisterToast(waitlisted: boolean) {
  return waitlisted ? GAME_TOAST.teamJoinedWaitlist : GAME_TOAST.teamRegistered;
}

export function kickedToast(name: string) {
  return `Kicked ${name}`;
}
