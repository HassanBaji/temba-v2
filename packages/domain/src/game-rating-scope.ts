import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { Sport } from "./sport";

/**
 * Rating scope (ADR-0053, ADR-0066): what a Game's completed Matches move.
 * `temba` moves the Temba Level, `group` a padel Group Level or, on football,
 * Tier points, `unrated` neither. Stored as `games.rated` and
 * `games.group_rated`.
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

/** A tier Group is a football Group that is not Verified (ADR-0066). */
export function groupHasTier(group: {
  sport: string | null | undefined;
  verified: boolean;
}) {
  return group.sport === "football" && !group.verified;
}

/**
 * The two stored flags for a new Game. A padel Game on a Group rates its
 * Group Level, and a Verified Group's also moves the Temba Level. A football
 * Game on a tier Group moves Tier points. `rated` is the creator's choice,
 * false for Unrated.
 */
export function ratingFlagsAtCreate(args: {
  hasGroup: boolean;
  groupVerified: boolean;
  sport: Sport;
  rated: boolean;
}): { rated: boolean; groupRated: boolean } {
  if (args.sport === "football") {
    const tier =
      args.hasGroup &&
      groupHasTier({ sport: args.sport, verified: args.groupVerified });
    return { rated: false, groupRated: tier && args.rated };
  }
  const groupRated = args.hasGroup && args.rated;
  return { rated: groupRated && args.groupVerified, groupRated };
}

/** The scope a creator gets if they keep the Game rated. */
export function ratedScopeForGroup(groupVerified: boolean): GameRatingScope {
  return groupVerified ? "temba" : "group";
}

/** The `group` scope reads as a group tier on football. */
export function gameRatingScopeLabel(
  scope: GameRatingScope,
  locale: Locale,
  sport?: string | null,
) {
  const m = messagesFor(locale);
  if (scope === "group" && sport === "football") {
    return m.rating.scope.group;
  }
  return m.you.ratingScope[scope];
}

/** The line under a `group` scope, which differs by sport. */
export function groupRatingScopeNote(
  locale: Locale,
  sport?: string | null,
): string {
  const m = messagesFor(locale);
  return sport === "football"
    ? m.rating.scope.groupNote
    : m.you.ratingScope.group_note;
}
