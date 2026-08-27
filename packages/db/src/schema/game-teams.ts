import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { games } from "./games";
import { relations } from "drizzle-orm";
import { gameTeamPlayers } from "./game-team-players";
import { teams } from "./teams";

export const gameTeams = pgTable("game_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  teamId: uuid("team_id").references(() => teams.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }),
  setsWon: integer("sets_won"),
  setsLost: integer("sets_lost"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const gameTeamRelations = relations(gameTeams, ({ one, many }) => ({
  game: one(games, { fields: [gameTeams.gameId], references: [games.id] }),
  team: one(teams, { fields: [gameTeams.teamId], references: [teams.id] }),
  players: many(gameTeamPlayers),
}));
