import { isNull, lte, sql, type SQL } from "drizzle-orm";

import { games } from "@repo/db";

/**
 * The order a Series numbers its Editions in (ADR-0105): window start, then
 * creation time, then id. Compared in SQL against stored rows: stored times
 * keep microseconds a JavaScript Date would round away, and two Games created
 * in one millisecond would then tie.
 */
const editionOrder = sql`${games.windowStart}, ${games.createdAt}, ${games.id}`;

/** A cancelled Game is no Edition and takes no number. */
export const isEdition = isNull(games.cancelledAt);

/** Each selected Game's Edition number inside its Series; select with `isEdition`. */
export const editionNumber =
  sql<number>`row_number() over (partition by ${games.seriesId} order by ${editionOrder})`.mapWith(
    Number,
  );

/**
 * The Games numbered before the Game `gameId`, read on its stored start or,
 * when it is being moved, on `windowStart`.
 */
export function editionsBefore(gameId: string, windowStart?: Date): SQL {
  const start = windowStart
    ? sql`${sql.param(windowStart, games.windowStart)}::timestamp`
    : sql`self.window_start`;
  return sql`(${editionOrder}) < (select ${start}, self.created_at, self.id from games self where self.id = ${gameId})`;
}

/**
 * The Games numbered before one created now to start at `windowStart`: it is
 * created after every Game already there, so one on the same start counts
 * before it.
 */
export function editionsBeforeNewGame(windowStart: Date) {
  return lte(games.windowStart, windowStart);
}
