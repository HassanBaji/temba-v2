/**
 * Game action labels, consequence lines and toasts. Sentence case, with the
 * glossary nouns (Game, Match, Set, Team, Level) capitalised as CONTEXT.md
 * writes them. Consequence lines are full sentences and end with a period.
 */

import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

export function joinGameAction(locale: Locale) {
  return messagesFor(locale).game.action.joinGame;
}

export function editGameAction(locale: Locale) {
  return messagesFor(locale).game.action.editGame;
}

export function cancelGameAction(locale: Locale) {
  return messagesFor(locale).game.action.cancelGame;
}

export function leaveGameAction(locale: Locale) {
  return messagesFor(locale).game.action.leaveGame;
}

export function leaveWaitlistAction(locale: Locale) {
  return messagesFor(locale).game.action.leaveWaitlist;
}

export function registerTeamAction(locale: Locale) {
  return messagesFor(locale).game.action.registerTeam;
}

export function cancelMatchAction(locale: Locale) {
  return messagesFor(locale).game.action.cancelMatch;
}

export function completeMatchAction(locale: Locale) {
  return messagesFor(locale).game.action.completeMatch;
}

export function markAsNotPlayedAction(locale: Locale) {
  return messagesFor(locale).game.action.markAsNotPlayed;
}

export function reportWrongScoreAction(locale: Locale) {
  return messagesFor(locale).game.action.reportWrongScore;
}

export function kickAction(locale: Locale) {
  return messagesFor(locale).game.action.kick;
}

export function closeRegistrationAction(locale: Locale) {
  return messagesFor(locale).game.action.closeRegistration;
}

export function reopenRegistrationAction(locale: Locale) {
  return messagesFor(locale).game.action.reopenRegistration;
}

export function cannotBeUndoneCopy(locale: Locale) {
  return messagesFor(locale).game.consequence.cannotBeUndone;
}

export function leaveGameConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.leaveGame;
}

/** The Organizer keeps the Game; leaving only frees their Position. */
export function leaveGameOrganizerConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.leaveGameOrganizer;
}

export function closeRegistrationConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.closeRegistration;
}

export function leaveWaitlistConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.leaveWaitlist;
}

export function markAsNotPlayedConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.markAsNotPlayed;
}

export function reportWrongScoreConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.reportWrongScore;
}

export function reportWrongScoreLockedConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.reportWrongScoreLocked;
}

export function completeMatchConsequence(locale: Locale) {
  return messagesFor(locale).game.consequence.completeMatch;
}

/** Who loses the Game from their calendar, counted from the seats taken. */
export function cancelGameConsequence(playerCount: number, locale: Locale) {
  const m = messagesFor(locale).game.consequence;
  if (playerCount <= 0) {
    return m.cancelNobodyJoined;
  }
  return m.cancelRemovesFromCalendar(playerCount);
}

export function setLabel(setIndex: number, locale: Locale) {
  return messagesFor(locale).game.setLabel(setIndex + 1);
}

/** Column heads too narrow for `Set 1`; pair with `setLabel` for the full name. */
export function setShortLabel(setIndex: number, locale: Locale) {
  return messagesFor(locale).game.setShortLabel(setIndex + 1);
}

export function gameToast(locale: Locale) {
  return messagesFor(locale).game.toast;
}

export function gameJoinToast(waitlisted: boolean, locale: Locale) {
  const toast = gameToast(locale);
  return waitlisted ? toast.joinedWaitlist : toast.joined;
}

export function teamRegisterToast(waitlisted: boolean, locale: Locale) {
  const toast = gameToast(locale);
  return waitlisted ? toast.teamJoinedWaitlist : toast.teamRegistered;
}

export function kickedToast(name: string, locale: Locale) {
  return messagesFor(locale).game.kickedToast(name);
}
