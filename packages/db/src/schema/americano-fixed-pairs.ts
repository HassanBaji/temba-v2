import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { gamePlayers } from "./game-players";
import { games } from "./games";

/**
 * Two players an Americano's Organizer keeps together in every Match (ADR-0113),
 * set before the Rounds are made. Removing either player removes the pair, so
 * both go back into the rotation.
 */
export const americanoFixedPairs = pgTable(
  "americano_fixed_pairs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    /** One-based pair number, as the Organizer picked them. */
    position: integer("position").notNull(),
    firstGamePlayerId: uuid("first_game_player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    secondGamePlayerId: uuid("second_game_player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGamePosition: uniqueIndex(
      "americano_fixed_pairs_game_id_position_unique",
    ).on(table.gameId, table.position),
    firstGamePlayerIdx: index(
      "americano_fixed_pairs_first_game_player_id_idx",
    ).on(table.firstGamePlayerId),
    secondGamePlayerIdx: index(
      "americano_fixed_pairs_second_game_player_id_idx",
    ).on(table.secondGamePlayerId),
  }),
);

export const americanoFixedPairRelations = relations(
  americanoFixedPairs,
  ({ one }) => ({
    game: one(games, {
      fields: [americanoFixedPairs.gameId],
      references: [games.id],
    }),
  }),
);
