import type { DraftShareCard } from "@repo/domain/football-draft-share";

export type DraftRowSize = {
  tile: number;
  init: number;
  name: number;
  badge: number;
  badgeText: number;
  code: number;
  codeWidth: number;
  padY: number;
  rowGap: number;
};

export const ROOMY: DraftRowSize = {
  tile: 68,
  init: 26,
  name: 40,
  badge: 50,
  badgeText: 30,
  code: 26,
  codeWidth: 72,
  padY: 12,
  rowGap: 0,
};

export const REGULAR: DraftRowSize = {
  tile: 60,
  init: 22,
  name: 32,
  badge: 40,
  badgeText: 24,
  code: 22,
  codeWidth: 60,
  padY: 9,
  rowGap: 14,
};

export const COMPACT: DraftRowSize = {
  tile: 44,
  init: 18,
  name: 28,
  badge: 34,
  badgeText: 20,
  code: 20,
  codeWidth: 56,
  padY: 4,
  rowGap: 10,
};

/** Rows a team's list may take before the rest reads "and N more". */
const BOTH_ROWS = 6;
const BOTH_REGULAR_ROWS = 4;
const ONE_COLUMN_ROWS = 9;

export type DraftListLayout = {
  size: DraftRowSize;
  columns: 1 | 2;
  rows: number;
  /** A short single column spreads over the card's free height. */
  spread: boolean;
};

/**
 * How the lists sit on a Draft card: both teams in two columns each, at a
 * smaller row once a team runs past four rows; one team in a roomy single
 * column up to nine players, then in two.
 */
export function draftListLayout(card: DraftShareCard): DraftListLayout {
  if (card.mode === "both") {
    const rowsNeeded = Math.max(
      0,
      ...card.sides.map((side) => Math.ceil(side.players.length / 2)),
    );
    return {
      size: rowsNeeded > BOTH_REGULAR_ROWS ? COMPACT : REGULAR,
      columns: 2,
      rows: BOTH_ROWS,
      spread: false,
    };
  }
  const oneColumn = (card.sides[0]?.players.length ?? 0) <= ONE_COLUMN_ROWS;
  return {
    size: oneColumn ? ROOMY : REGULAR,
    columns: oneColumn ? 1 : 2,
    rows: ONE_COLUMN_ROWS,
    spread: oneColumn,
  };
}

/** The players a list has room for, the last cell giving way to "and N more". */
export function fitPlayers<T>(players: readonly T[], room: number) {
  if (players.length <= room) {
    return { shown: players, more: 0 };
  }
  return {
    shown: players.slice(0, room - 1),
    more: players.length - (room - 1),
  };
}
