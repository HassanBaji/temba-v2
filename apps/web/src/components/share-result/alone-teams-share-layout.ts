export type AloneShareFrame = "story" | "square";

export type AloneShareLayout = {
  columns: 1 | 2;
  /** Two names over each other in a row, instead of side by side. */
  stacked: boolean;
  rowHeight: number;
  namePx: number;
};

/** The height the team rows get on each image, under the head and above the foot. */
const ROWS_HEIGHT: Record<AloneShareFrame, number> = {
  story: 1000,
  square: 600,
};

const MAX_ROW: Record<AloneShareFrame, { single: number; stacked: number }> = {
  story: { single: 96, stacked: 120 },
  square: { single: 96, stacked: 130 },
};

/** A Story holds up to twelve teams in one column of pairs; more go two columns, names stacked. */
const STORY_SINGLE_COLUMN_MAX = 12;

/** How the teams fit on a share image: every team on it, the rows shrinking as they grow. */
export function aloneShareLayout(
  teamCount: number,
  frame: AloneShareFrame,
): AloneShareLayout {
  const columns: 1 | 2 =
    frame === "story" && teamCount <= STORY_SINGLE_COLUMN_MAX ? 1 : 2;
  const stacked = columns === 2;
  const rows = Math.max(1, Math.ceil(teamCount / columns));
  const max = stacked ? MAX_ROW[frame].stacked : MAX_ROW[frame].single;
  const rowHeight = Math.min(max, Math.floor(ROWS_HEIGHT[frame] / rows));
  const namePx = Math.min(34, Math.round(rowHeight * (stacked ? 0.27 : 0.36)));
  return { columns, stacked, rowHeight, namePx };
}
