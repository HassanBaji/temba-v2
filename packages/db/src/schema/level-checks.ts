import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { groupSports } from "./group-enums";
import { matches } from "./matches";
import { ratingLevelBands } from "./ratings";
import { user } from "./user";

/**
 * One seated account holder's answer to "What level did they play at?" about
 * another player of a padel Match with a Rating window (the Level check).
 * `band` is the picked display band's lower stored band. Hidden like a
 * Performance rating, never about oneself, and kept through a wrong-score
 * report.
 */
export const levelCheckBallots = pgTable(
  "level_check_ballots",
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
    band: ratingLevelBands("band").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    oneBallot: unique("level_check_ballots_match_rater_ratee_unique").on(
      table.matchId,
      table.raterUserId,
      table.rateeUserId,
    ),
    notSelf: check(
      "level_check_ballots_not_self_check",
      sql`${table.raterUserId} <> ${table.rateeUserId}`,
    ),
    raterIdx: index("level_check_ballots_rater_user_id_idx").on(
      table.raterUserId,
    ),
    rateeIdx: index("level_check_ballots_ratee_user_id_idx").on(
      table.rateeUserId,
    ),
  }),
);

/**
 * What a settled Level check moved for one player of one Match. Not a Rated
 * Match, so it has its own ledger beside `rating_events`, `level_overrides`
 * and `king_place_awards`. σ and `last_rated_at` never move.
 */
export const levelCheckResults = pgTable(
  "level_check_results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sport: groupSports().notNull(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    verdictLevelHundredths: integer("verdict_level_hundredths").notNull(),
    /** The verdict was the band the player showed, so μ stayed. */
    agreed: boolean("agreed").notNull(),
    ballotsCounted: integer("ballots_counted").notNull(),
    /** The Game's weight, which blends the step. */
    weight: doublePrecision("weight").notNull(),
    muBefore: doublePrecision("mu_before").notNull(),
    phiBefore: doublePrecision("phi_before").notNull(),
    muAfter: doublePrecision("mu_after").notNull(),
    phiAfter: doublePrecision("phi_after").notNull(),
    levelBandBefore: ratingLevelBands("level_band_before").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    oneResult: unique("level_check_results_user_id_match_id_unique").on(
      table.userId,
      table.matchId,
    ),
    matchIdx: index("level_check_results_match_id_idx").on(table.matchId),
  }),
);
