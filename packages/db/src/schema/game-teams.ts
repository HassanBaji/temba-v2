import {
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { games } from "./games";
import { gameTeamPlayers } from "./game-team-players";
import { teams } from "./teams";
import { matches } from "./matches";

export const gameTeams = pgTable(
  "game_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    name: varchar("name", { length: 255 }),
    sideIndex: integer("side_index"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueLiveTeam: uniqueIndex("game_teams_game_id_team_id_unique")
      .on(table.gameId, table.teamId)
      .where(sql`${table.teamId} is not null`),
    uniqueLiveSide: uniqueIndex("game_teams_game_id_side_index_unique")
      .on(table.gameId, table.sideIndex)
      .where(sql`${table.sideIndex} is not null`),
  }),
);

export const gameTeamRelations = relations(gameTeams, ({ one, many }) => ({
  game: one(games, { fields: [gameTeams.gameId], references: [games.id] }),
  team: one(teams, { fields: [gameTeams.teamId], references: [teams.id] }),
  players: many(gameTeamPlayers),
  slot1Matches: many(matches, { relationName: "matchSlot1" }),
  slot2Matches: many(matches, { relationName: "matchSlot2" }),
}));
