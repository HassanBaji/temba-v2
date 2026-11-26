import { relations } from "drizzle-orm";
import {
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { matches } from "./matches";
import { user } from "./user";

export const SCORE_CHANGE_REASON_VALUES = [
  "set_score_wrong",
  "sets_swapped",
  "not_finished",
  "other",
] as const;

export type ScoreChangeReason = (typeof SCORE_CHANGE_REASON_VALUES)[number];

export const scoreChangeReasons = pgEnum(
  "score_change_reason",
  SCORE_CHANGE_REASON_VALUES,
);

export type ScoreChangeSet = {
  setNumber: number;
  slot1GamesWon: number | null;
  slot2GamesWon: number | null;
};

/**
 * What the score a padel Match is waiting on replaced (ADR-0115): who changed
 * an entered score, the Sets it had before, and the optional reason. One row
 * per Match, for the score as it stands: the next change replaces it, and it
 * goes when the score is entered afresh or the Match is reopened.
 */
export const matchScoreChanges = pgTable(
  "match_score_changes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    changedByUserId: uuid("changed_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    reason: scoreChangeReasons("reason"),
    previousSets: jsonb("previous_sets").$type<ScoreChangeSet[]>().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueMatch: unique("match_score_changes_match_id_unique").on(
      table.matchId,
    ),
  }),
);

export const matchScoreChangeRelations = relations(
  matchScoreChanges,
  ({ one }) => ({
    match: one(matches, {
      fields: [matchScoreChanges.matchId],
      references: [matches.id],
    }),
    changedBy: one(user, {
      fields: [matchScoreChanges.changedByUserId],
      references: [user.id],
    }),
  }),
);
