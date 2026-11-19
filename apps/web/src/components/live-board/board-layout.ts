export const BOARD_WIDTH = 1280;
export const BOARD_HEIGHT = 720;

/** The scale that fits the 1280 by 720 board inside a screen, letterboxed. */
export function boardScale(viewport: { width: number; height: number }) {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return 0;
  }
  return Math.min(viewport.width / BOARD_WIDTH, viewport.height / BOARD_HEIGHT);
}

export type CourtGrid = {
  columns: 2 | 3;
  /** Courts drawn at once; a longer Round turns its page. */
  pageSize: number;
  dense: boolean;
};

/** Four Courts make the two-by-two of the design; five or six take three columns. */
export function courtGrid(matchCount: number): CourtGrid {
  if (matchCount <= 4) {
    return { columns: 2, pageSize: 4, dense: false };
  }
  return { columns: 3, pageSize: 6, dense: true };
}

export const TABLE_ROWS_REGULAR = 8;
export const TABLE_ROWS_DENSE = 12;

/** Eight rows fit at full size and twelve at a tighter one; more turn the page. */
export function tableLayout(rowCount: number) {
  return rowCount <= TABLE_ROWS_REGULAR
    ? { dense: false, pageSize: TABLE_ROWS_REGULAR }
    : { dense: true, pageSize: TABLE_ROWS_DENSE };
}

export const STRIP_CELLS = 5;

/** "01": a table place reads as two digits, the way the design sets it. */
export function placeCode(place: number) {
  return String(place).padStart(2, "0");
}
