import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import type { Sport } from "./sport";

/**
 * Rating scope (ADR-0066): what a Game's completed Matches move. `temba`
 * moves the Temba Level, `group` Tier points on football, `unrated` neither.
 * A padel Game completed before the Group Level was retired can still read
 * `group`. Stored as `games.rated` and `games.group_rated`.
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
 * The two stored flags for a new Game. A padel Game on a Verified Group moves
 * the Temba Level, and on any other Group is Unrated: padel Groups keep only a
 * Standing (ADR-0066). A football Game on a tier Group moves Tier points, and
 * on a Verified Group the Temba Level only (ADR-0069). `rated` is the
 * creator's choice, false for Unrated.
 */
export function ratingFlagsAtCreate(args: {
  hasGroup: boolean;
  groupVerified: boolean;
  sport: Sport;
  rated: boolean;
}): { rated: boolean; groupRated: boolean } {
  if (args.sport === "football") {
    const counts = args.hasGroup && args.rated;
    return {
      rated: counts && args.groupVerified,
      groupRated: counts && !args.groupVerified,
    };
  }
  return {
    rated: args.hasGroup && args.rated && args.groupVerified,
    groupRated: false,
  };
}

/**
 * The scope a creator gets if they keep the Game rated: the Temba Level on a
 * Verified Group, Tier points on a tier Group, nothing on a padel Group that
 * is not Verified. A missing sport reads as padel.
 */
export function ratedScopeForGroup(
  groupVerified: boolean,
  sport?: Sport,
): GameRatingScope {
  if (groupVerified) {
    return "temba";
  }
  return sport === "football" ? "group" : "unrated";
}

/** On football the `group` scope reads as a group tier, `temba` as the Temba Level. */
export function gameRatingScopeLabel(
  scope: GameRatingScope,
  locale: Locale,
  sport?: string | null,
) {
  const m = messagesFor(locale);
  if (sport === "football" && scope !== "unrated") {
    return m.rating.scope[scope];
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

/** The line under a `temba` scope, which differs by sport. */
export function tembaRatingScopeNote(
  locale: Locale,
  sport?: string | null,
): string {
  const m = messagesFor(locale);
  return sport === "football"
    ? m.rating.scope.tembaNote
    : m.you.ratingScope.temba_note;
}
