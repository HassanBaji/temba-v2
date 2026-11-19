import {
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export type RatingReplayTable =
  | "ratings"
  | "rating_events"
  | "king_place_awards"
  | "level_overrides";

export type RatingReplaySummary = {
  /** Rows the run updated, by table. */
  changed: Record<RatingReplayTable, number>;
  /** Padel ledger rows when the run was applied, so a restore can tell one was added or removed since. */
  ledger: { events: number; overrides: number; awards: number };
  /** Rows the run could not recompute and carried over by their stored move. */
  carriedUnplaced: number;
};

/** One applied Level recalculation (ADR-0100). A run that would change nothing is not recorded. */
export const ratingReplayRuns = pgTable("rating_replay_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  appliedAt: timestamp("applied_at").notNull().defaultNow(),
  rules: text("rules").notNull(),
  summary: jsonb("summary").$type<RatingReplaySummary>().notNull(),
});

/**
 * A row as it stood before a Level recalculation changed it, so `--restore`
 * can write it back, and the values the run wrote over it, so `--restore`
 * can tell whether anything has written them since.
 */
export const ratingReplayBackups = pgTable(
  "rating_replay_backups",
  {
    runId: uuid("run_id")
      .references(() => ratingReplayRuns.id, { onDelete: "cascade" })
      .notNull(),
    tableName: text("table_name").$type<RatingReplayTable>().notNull(),
    rowId: uuid("row_id").notNull(),
    row: jsonb("row").notNull(),
    written: jsonb("written").$type<Record<string, unknown>>().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.runId, table.tableName, table.rowId] }),
  }),
);
