import { pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { gameTeams } from "./game-teams";
import { gamePlayers } from "./game-players";

export const gameTeamPlayers = pgTable("game_team_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameTeamId: uuid("game_team_id")
    .notNull()
    .references(() => gameTeams.id, { onDelete: "cascade" }),
  gamePlayerId: uuid("game_player_id")
    .notNull()
    .references(() => gamePlayers.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
