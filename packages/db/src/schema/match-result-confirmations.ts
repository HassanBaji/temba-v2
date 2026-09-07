import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { matches } from "./matches";
import { user } from "./user";

/**
 * A seated User's acknowledgement that a Match's entered Sets are correct
 * (ADR-0011). One row per Match per User; the User who enters the Set that
 * first produces a Match result is confirmed automatically, and each other
 * seated User confirms once via the `confirmMatchResult` door.
 */
export const matchResultConfirmations = pgTable(
  "match_result_confirmations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueMatchUser: unique("match_result_confirmations_match_id_user_id_unique").on(
      table.matchId,
      table.userId,
    ),
  }),
);

export const matchResultConfirmationRelations = relations(
  matchResultConfirmations,
  ({ one }) => ({
    match: one(matches, {
      fields: [matchResultConfirmations.matchId],
      references: [matches.id],
    }),
    user: one(user, {
      fields: [matchResultConfirmations.userId],
      references: [user.id],
    }),
  }),
);
