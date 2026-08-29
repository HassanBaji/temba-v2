import { integer, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { courts } from "./courts";
import { games } from "./games";
import { gameTeams } from "./game-teams";
import { matchSets } from "./match-sets";
import { gameStatus, MatchStatusEnum } from "./game-enums";

export const matches = pgTable("matches", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => games.id, { onDelete: "cascade" }),
  courtId: uuid("court_id").references(() => courts.id, {
    onDelete: "set null",
  }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  durationInMinutes: integer("duration_in_minutes"),
  status: gameStatus("status").default(MatchStatusEnum.PENDING),
  slot1GameTeamId: uuid("slot_1_game_team_id").references(() => gameTeams.id, {
    onDelete: "set null",
  }),
  slot2GameTeamId: uuid("slot_2_game_team_id").references(() => gameTeams.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const matchRelations = relations(matches, ({ one, many }) => ({
  game: one(games, { fields: [matches.gameId], references: [games.id] }),
  court: one(courts, { fields: [matches.courtId], references: [courts.id] }),
  slot1GameTeam: one(gameTeams, {
    fields: [matches.slot1GameTeamId],
    references: [gameTeams.id],
    relationName: "matchSlot1",
  }),
  slot2GameTeam: one(gameTeams, {
    fields: [matches.slot2GameTeamId],
    references: [gameTeams.id],
    relationName: "matchSlot2",
  }),
  sets: many(matchSets),
}));
