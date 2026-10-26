import {
  check,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { matches } from "./matches";
import { user } from "./user";

/**
 * Goals a User scored in a football Match. Optional and separate from the
 * Score: the Score is the Match's one Set, and goals named here never
 * outnumber their side's Score.
 */
export const matchGoals = pgTable(
  "match_goals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    goals: integer("goals").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueMatchUser: unique("match_goals_match_id_user_id_unique").on(
      table.matchId,
      table.userId,
    ),
    goalsCheck: check(
      "match_goals_goals_check",
      sql`${table.goals} between 1 and 99`,
    ),
  }),
);

export const matchGoalRelations = relations(matchGoals, ({ one }) => ({
  match: one(matches, {
    fields: [matchGoals.matchId],
    references: [matches.id],
  }),
  user: one(user, { fields: [matchGoals.userId], references: [user.id] }),
}));
