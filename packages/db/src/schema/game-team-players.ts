import { relations, sql } from "drizzle-orm";
import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { gamePositions } from "./game-enums";
import { gameTeams } from "./game-teams";
import { gamePlayers } from "./game-players";

export const gameTeamPlayers = pgTable(
  "game_team_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameTeamId: uuid("game_team_id")
      .notNull()
      .references(() => gameTeams.id, { onDelete: "cascade" }),
    gamePlayerId: uuid("game_player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    position: gamePositions("position"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniquePosition: uniqueIndex(
      "game_team_players_game_team_id_position_unique",
    )
      .on(table.gameTeamId, table.position)
      .where(sql`${table.position} is not null`),
  }),
);

export const gameTeamPlayerRelations = relations(
  gameTeamPlayers,
  ({ one }) => ({
    gameTeam: one(gameTeams, {
      fields: [gameTeamPlayers.gameTeamId],
      references: [gameTeams.id],
    }),
    gamePlayer: one(gamePlayers, {
      fields: [gameTeamPlayers.gamePlayerId],
      references: [gamePlayers.id],
    }),
  }),
);
