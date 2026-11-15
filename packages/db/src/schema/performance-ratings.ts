import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  smallint,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { performanceRatingModes } from "./group-enums";
import { matches } from "./matches";
import { user } from "./user";

/**
 * A 1 to 10 Performance rating one seated account holder, or an Organizer of
 * the Game, gave another player of a completed football Match (ADR-0068).
 * Never to oneself. Kept through a wrong-score report.
 */
export const performanceRatings = pgTable(
  "performance_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    raterUserId: uuid("rater_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    rateeUserId: uuid("ratee_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    value: smallint("value").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    oneBallot: unique("performance_ratings_match_rater_ratee_unique").on(
      table.matchId,
      table.raterUserId,
      table.rateeUserId,
    ),
    valueCheck: check(
      "performance_ratings_value_check",
      sql`${table.value} between 1 and 10`,
    ),
    notSelf: check(
      "performance_ratings_not_self_check",
      sql`${table.raterUserId} <> ${table.rateeUserId}`,
    ),
    raterIdx: index("performance_ratings_rater_user_id_idx").on(
      table.raterUserId,
    ),
    rateeIdx: index("performance_ratings_ratee_user_id_idx").on(
      table.rateeUserId,
    ),
  }),
);

/**
 * A football Match's Rating window, opened at completion with a snapshot of
 * the Group's Rating settings, so a later change applies from the next Game.
 * Settled once; suspended by a wrong-score report and reopened by the next
 * completion.
 */
export const matchRatingWindows = pgTable(
  "match_rating_windows",
  {
    matchId: uuid("match_id")
      .primaryKey()
      .references(() => matches.id, { onDelete: "cascade" }),
    closesAt: timestamp("closes_at").notNull(),
    settledAt: timestamp("settled_at"),
    suspendedAt: timestamp("suspended_at"),
    mode: performanceRatingModes("mode").notNull(),
    weightPercent: integer("weight_percent").notNull(),
    organizerCountsDouble: boolean("organizer_counts_double")
      .notNull()
      .default(false),
    countsForLevel: boolean("counts_for_level").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    modeCheck: check(
      "match_rating_windows_mode_check",
      sql`${table.mode} <> 'off'`,
    ),
    weightCheck: check(
      "match_rating_windows_weight_percent_check",
      sql`${table.weightPercent} between 0 and 100`,
    ),
  }),
);

/** Each rated player's settled Performance rating on a Match, in hundredths. */
export const performanceRatingResults = pgTable(
  "performance_rating_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    ratingHundredths: integer("rating_hundredths").notNull(),
    ballotsCounted: integer("ballots_counted").notNull(),
    gameAverageHundredths: integer("game_average_hundredths").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    oneResult: unique("performance_rating_results_match_user_unique").on(
      table.matchId,
      table.userId,
    ),
    userIdx: index("performance_rating_results_user_id_idx").on(table.userId),
  }),
);

export const performanceRatingRelations = relations(
  performanceRatings,
  ({ one }) => ({
    match: one(matches, {
      fields: [performanceRatings.matchId],
      references: [matches.id],
    }),
    rater: one(user, {
      fields: [performanceRatings.raterUserId],
      references: [user.id],
    }),
    ratee: one(user, {
      fields: [performanceRatings.rateeUserId],
      references: [user.id],
    }),
  }),
);

export const matchRatingWindowRelations = relations(
  matchRatingWindows,
  ({ one }) => ({
    match: one(matches, {
      fields: [matchRatingWindows.matchId],
      references: [matches.id],
    }),
  }),
);

export const performanceRatingResultRelations = relations(
  performanceRatingResults,
  ({ one }) => ({
    match: one(matches, {
      fields: [performanceRatingResults.matchId],
      references: [matches.id],
    }),
    user: one(user, {
      fields: [performanceRatingResults.userId],
      references: [user.id],
    }),
  }),
);
