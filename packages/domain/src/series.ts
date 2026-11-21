import type { Locale } from "@repo/i18n/locale";
import { messagesFor } from "@repo/i18n/messages";

import { isDrawnTournament } from "./tournament-rounds";

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

export type SeriesEditionGame = {
  id: string;
  windowStart: Date;
  createdAt: Date;
};

function editionOrder(a: SeriesEditionGame, b: SeriesEditionGame) {
  const byStart = a.windowStart.getTime() - b.windowStart.getTime();
  if (byStart !== 0) {
    return byStart;
  }
  const byCreated = a.createdAt.getTime() - b.createdAt.getTime();
  if (byCreated !== 0) {
    return byCreated;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * The Edition number of each of a Series' Games that are not cancelled: 1 for
 * the earliest by window start, then creation time, then id (ADR-0105).
 */
export function seriesEditionNumbers(
  games: readonly SeriesEditionGame[],
): Map<string, number> {
  return new Map(
    [...games]
      .sort(editionOrder)
      .map((game, index) => [game.id, index + 1] as const),
  );
}
