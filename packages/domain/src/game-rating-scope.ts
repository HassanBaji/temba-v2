import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { Sport } from "./sport";

/**
 * Rating scope (ADR-0053): what a Game's completed Matches rate. `temba`
 * moves the Temba Level and the Group Level, `group` the Group Level only,
 * `unrated` neither. Stored as `games.rated` and `games.group_rated`.
 */
export const GAME_RATING_SCOPES = ["temba", "group", "unrated"] as const;

export type GameRatingScope = (typeof GAME_RATING_SCOPES)[number];

export function gameRatingScope(game: {
  rated: boolean;
  groupRated: boolean;
}): GameRatingScope {
  if (game.rated) {
    return "temba";
  }
  return game.groupRated ? "group" : "unrated";
}

/**
 * The two stored flags for a new Game. Only a padel Game on a Group rates;
 * a Verified Group's also moves the Temba Level. `rated` is the creator's
 * choice, false for Unrated.
 */
export function ratingFlagsAtCreate(args: {
  hasGroup: boolean;
  groupVerified: boolean;
  sport: Sport;
  rated: boolean;
}): { rated: boolean; groupRated: boolean } {
  const groupRated = args.hasGroup && args.sport === "padel" && args.rated;
  return { rated: groupRated && args.groupVerified, groupRated };
}

/** The scope a creator gets if they keep the Game rated. */
export function ratedScopeForGroup(groupVerified: boolean): GameRatingScope {
  return groupVerified ? "temba" : "group";
}

export function gameRatingScopeLabel(scope: GameRatingScope, locale: Locale) {
  return messagesFor(locale).you.ratingScope[scope];
}
