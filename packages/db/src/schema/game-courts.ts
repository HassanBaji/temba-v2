import { pgTable, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { courts } from "./courts";
import { games } from "./games";

/**
 * Courts recorded on an Americano or Friendly tournament at create.
 * Friendly game inserts none. Game delete and Court delete cascade these rows.
 * Match.courtId remains the Court on a contest (on delete set null).
 */
export const gameCourts = pgTable(
  "game_courts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    courtId: uuid("court_id")
      .notNull()
      .references(() => courts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGameCourt: unique("game_courts_game_id_court_id_unique").on(
      table.gameId,
      table.courtId,
    ),
  }),
);

export const gameCourtRelations = relations(gameCourts, ({ one }) => ({
  game: one(games, { fields: [gameCourts.gameId], references: [games.id] }),
  court: one(courts, { fields: [gameCourts.courtId], references: [courts.id] }),
}));
