import { and, eq, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * A row's time cut to the millisecond a JavaScript Date holds. The stored
 * time has microseconds, and rows one transaction writes share it, so every
 * history read orders and pages on the cut time: the sources, the cursor and
 * the "Level confirmed" milestone then agree on one order.
 */
export function shownAt(column: AnyPgColumn) {
  return sql`date_trunc('milliseconds', ${column})`;
}

/** `shownAt` read back as the ISO string a Date parses without loss. */
export function shownAtIso(column: AnyPgColumn) {
  return sql<string>`to_char(${shownAt(column)}, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/**
 * Rows past a newest-first cursor, the id breaking a tie on the time;
 * `andAt` keeps the cursor's own row as well.
 */
export function olderThanShown(
  columns: { createdAt: AnyPgColumn; id: AnyPgColumn },
  cursor: { createdAt: Date; id: string } | undefined,
  andAt = false,
): SQL | undefined {
  if (!cursor) {
    return undefined;
  }
  const at = cursor.createdAt.toISOString();
  return or(
    lt(shownAt(columns.createdAt), at),
    and(
      eq(shownAt(columns.createdAt), at),
      (andAt ? lte : lt)(columns.id, cursor.id),
    ),
  );
}
