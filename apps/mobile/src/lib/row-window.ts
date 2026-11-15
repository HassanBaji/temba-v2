import { useState } from "react";

export const ROW_WINDOW = 50;

/** The first `count` rows, and how many are left for "Show more". */
export function windowedRows<T>(
  rows: readonly T[],
  count: number,
): { shown: readonly T[]; hidden: number } {
  return {
    shown: rows.length > count ? rows.slice(0, count) : rows,
    hidden: Math.max(0, rows.length - count),
  };
}

/**
 * How many rows of a long table inside a screen's scroll view to mount. A
 * FlatList cannot virtualise inside that scroll view, so the table grows a
 * window at a time and starts over when `resetKey` (the search, sort or
 * filter) changes.
 */
export function useRowWindow(resetKey: string) {
  const [state, setState] = useState({ key: resetKey, count: ROW_WINDOW });
  const count = state.key === resetKey ? state.count : ROW_WINDOW;
  return {
    count,
    showMore: () => setState({ key: resetKey, count: count + ROW_WINDOW }),
  };
}
