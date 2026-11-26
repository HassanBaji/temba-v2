import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { isAmericano } from "./tournament-americano";
import { isKingOfTheCourt } from "./tournament-king";
import { hasKnockout, isDrawnTournament } from "./tournament-rounds";

/** The seven emblems of a Series badge, in the picker's order. */
export const SERIES_EMBLEMS = [
  "cup",
  "crown",
  "star",
  "bolt",
  "flame",
  "moon",
  "ball",
] as const;

export type SeriesEmblem = (typeof SERIES_EMBLEMS)[number];

/** The six colours of a Series badge, in the picker's order. */
export const SERIES_COLOURS = [
  "gold",
  "red",
  "blue",
  "green",
  "purple",
  "teal",
] as const;

export type SeriesColour = (typeof SERIES_COLOURS)[number];

export const DEFAULT_SERIES_EMBLEM: SeriesEmblem = "cup";

export const DEFAULT_SERIES_COLOUR: SeriesColour = "gold";

export const SERIES_NAME_MAX_LENGTH = 40;

/** A Group runs at most this many Series at a time. */
export const SERIES_RUNNING_MAX = 10;

function nameKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

/**
 * Why a Series name cannot be used, or null. Names are compared trimmed and
 * without case against the Group's running Series; an ended one frees its name.
 */
export function seriesNameError(
  name: string,
  runningNames: readonly string[],
  locale: Locale,
): string | null {
  const errors = messagesFor(locale).series.errors;
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return errors.nameRequired;
  }
  if (trimmed.length > SERIES_NAME_MAX_LENGTH) {
    return errors.nameTooLong(SERIES_NAME_MAX_LENGTH);
  }
  const key = nameKey(trimmed);
  if (runningNames.some((running) => nameKey(running) === key)) {
    return errors.nameTaken;
  }
  return null;
}

export type SeriesCarrierGame = {
  format: string;
  groupId: string | null;
  challengeId: string | null;
  poolCount: number | null;
  tournamentShape: string | null;
};

/**
 * Whether a Game can be an Edition of a Series: a Group's Friendly game that
 * is not a Challenge Game, or a drawn Friendly tournament in any Tournament
 * shape. The legacy Americano format and a hand-built legacy tournament have
 * no result a Series could read.
 */
export function carriesSeries(game: SeriesCarrierGame): boolean {
  if (game.groupId === null) {
    return false;
  }
  if (game.format === "friendly_game") {
    return game.challengeId === null;
  }
  return isDrawnTournament(game.format, game.poolCount, game.tournamentShape);
}

export type SeriesWinRule =
  | "side"
  | "table"
  | "tables"
  | "champion"
  | "king"
  | "americano";

/**
 * Which rule an Edition of this Game is won by, for its result and its copy:
 * the winning side of a Friendly game, the top of one table or of each Pool's
 * table, the Champion of a Knockout, the king of the court, or the top of an
 * Americano.
 */
export function seriesWinRule(game: {
  format: string;
  tournamentShape: string | null;
  poolCount: number | null;
}): SeriesWinRule {
  if (game.format === "friendly_game") {
    return "side";
  }
  if (isKingOfTheCourt(game.format, game.tournamentShape)) {
    return "king";
  }
  if (isAmericano(game.format, game.tournamentShape)) {
    return "americano";
  }
  if (hasKnockout(game.format, game.tournamentShape)) {
    return "champion";
  }
  return (game.poolCount ?? 1) > 1 ? "tables" : "table";
}

/** A winner's wins show as this many small badges at most; beyond it, only the count. */
export const SERIES_SMALL_BADGES_MAX = 3;

/** How many small badges stand for these wins: one per win, none past the most. */
export function seriesSmallBadgeCount(wins: number) {
  return wins <= SERIES_SMALL_BADGES_MAX ? Math.max(0, wins) : 0;
}

/** Ranks of winners listed by wins, most first: ties share a rank (1, 1, 3, 3). */
export function seriesWinnerRanks(wins: readonly number[]) {
  return wins.map((count) => wins.indexOf(count) + 1);
}
