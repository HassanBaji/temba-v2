import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { matches } from "./matches";

export const matchSets = pgTable("match_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  matchId: uuid("match_id")
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  slot1GamesWon: integer("slot_1_games_won"),
  slot2GamesWon: integer("slot_2_games_won"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchSetRelations = relations(matchSets, ({ one }) => ({
  match: one(matches, {
    fields: [matchSets.matchId],
    references: [matches.id],
  }),
}));
