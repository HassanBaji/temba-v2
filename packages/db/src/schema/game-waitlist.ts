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
import { teams } from "./teams";

export const gameWaitlist = pgTable(
  "game_waitlist",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references(() => teams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    fifoIdx: index("game_waitlist_game_id_created_at_idx").on(
      table.gameId,
      table.createdAt,
    ),
    uniqueGameUser: uniqueIndex("game_waitlist_game_id_user_id_unique")
      .on(table.gameId, table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueGameTeam: uniqueIndex("game_waitlist_game_id_team_id_unique")
      .on(table.gameId, table.teamId)
      .where(sql`${table.teamId} is not null`),
  }),
);

export const gameWaitlistRelations = relations(gameWaitlist, ({ one }) => ({
  game: one(games, { fields: [gameWaitlist.gameId], references: [games.id] }),
  user: one(user, { fields: [gameWaitlist.userId], references: [user.id] }),
  team: one(teams, { fields: [gameWaitlist.teamId], references: [teams.id] }),
}));
