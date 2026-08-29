import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { games } from "./games";
import { user } from "./user";
import { gameTeamPlayers } from "./game-team-players";

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_user_id").on(table.userId),
    gameIdx: index("idx_game_id").on(table.gameId),
    uniqueGameUser: uniqueIndex("game_players_game_id_user_id_unique")
      .on(table.gameId, table.userId)
      .where(sql`${table.userId} is not null`),
  }),
);

export const gamePlayerRelations = relations(gamePlayers, ({ one, many }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
  user: one(user, { fields: [gamePlayers.userId], references: [user.id] }),
  gameTeamPlayers: many(gameTeamPlayers),
}));
