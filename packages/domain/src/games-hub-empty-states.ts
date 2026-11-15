import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { SportFilter } from "./football-hub";
import { groupGamePlayersNeeded } from "./group-empty-states";
import { sportLabel } from "./sport";

export function gamesHubEmptyTitle(locale: Locale) {
  return messagesFor(locale).game.hubEmpty.noGamesYet;
}

export function gamesHistoryEmptyTitle(locale: Locale) {
  return messagesFor(locale).game.hubEmpty.noHistoryYet;
}

export function gamesHistoryEmptyCopy(locale: Locale) {
  return messagesFor(locale).game.hubEmpty.historyCopy;
}

/** The Played placeholder draws this many not-played result marks. */
export const GAMES_HISTORY_PREVIEW_MARKS = 5;

export function gamesHistoryPreviewFigures(locale: Locale): readonly string[] {
  const m = messagesFor(locale).game.hubEmpty;
  return [m.played, m.won, m.lost];
}

/** Seats the Upcoming placeholder draws: a padel Match unless the filter is football. */
export function gamesHubEmptySeats(filter: SportFilter) {
  return groupGamePlayersNeeded(filter === "football" ? "football" : "padel");
}

export function gamesHubEmptyLine(filter: SportFilter, locale: Locale) {
  const m = messagesFor(locale).game.hubEmpty;
  const sport = filter === "all" ? null : sportLabel(filter, locale);
  return sport ? m.sportLine(sport) : m.line;
}

/** The Public tab before any Public Game the viewer may join (ADR-0071). */
export function publicGamesEmptyTitle(locale: Locale) {
  return messagesFor(locale).rating.publicGame.hub.emptyTitle;
}

export function publicGamesEmptyLine(filter: SportFilter, locale: Locale) {
  const m = messagesFor(locale).rating.publicGame.hub;
  const sport = filter === "all" ? null : sportLabel(filter, locale);
  return sport ? m.emptySportLine(sport) : m.emptyLine;
}
