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
import { matches } from "./matches";

/**
 * An Americano Match's sides (ADR-0094). Partners change every Round, so a
 * side is two Game players for one Match, not a Game team: the Match's slot
 * Game teams stay empty and each player holds slot 1 or slot 2 here.
 */
export const americanoSeats = pgTable(
  "americano_seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    gamePlayerId: uuid("game_player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    slot: integer("slot").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueMatchPlayer: uniqueIndex(
      "americano_seats_match_id_game_player_id_unique",
    ).on(table.matchId, table.gamePlayerId),
    matchIdx: index("americano_seats_match_id_idx").on(table.matchId),
    gamePlayerIdx: index("americano_seats_game_player_id_idx").on(
      table.gamePlayerId,
    ),
  }),
);

export const americanoSeatRelations = relations(americanoSeats, ({ one }) => ({
  match: one(matches, {
    fields: [americanoSeats.matchId],
    references: [matches.id],
  }),
  gamePlayer: one(gamePlayers, {
    fields: [americanoSeats.gamePlayerId],
    references: [gamePlayers.id],
  }),
}));
