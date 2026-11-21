import type { SeriesColour, SeriesEmblem } from "@repo/domain/series";

export type SeriesAttachOption = {
  id: string;
  name: string;
  emblem: SeriesEmblem;
  colour: SeriesColour;
  edition: number;
};

/** The picked Series while it is still offered; otherwise none. */
export function seriesAttachPick<T extends { id: string }>(
  options: readonly T[],
  seriesId: string | null,
): T | null {
  return seriesId
    ? (options.find((option) => option.id === seriesId) ?? null)
    : null;
}

/**
 * Edit game's choices: the Series the Game already has stays one even once it
 * has ended, so it can be kept.
 */
export function seriesEditOptions<T extends { id: string }>(
  options: readonly T[],
  current: T | null,
): readonly T[] {
  if (!current || options.some((option) => option.id === current.id)) {
    return options;
  }
  return [current, ...options];
}
