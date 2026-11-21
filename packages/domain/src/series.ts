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
