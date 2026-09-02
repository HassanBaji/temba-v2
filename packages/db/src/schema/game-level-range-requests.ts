import { pgTable, uuid, timestamp, pgEnum, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./user";
import { games } from "./games";

export const gameLevelRangeRequestStatuses = pgEnum(
  "game_level_range_request_status",
  ["pending", "approved", "rejected"],
);

export enum GameLevelRangeRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export const gameLevelRangeRequests = pgTable(
  "game_level_range_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .references(() => games.id, { onDelete: "restrict" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: gameLevelRangeRequestStatuses()
      .notNull()
      .default(GameLevelRangeRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGameUser: unique(
      "game_level_range_requests_game_id_user_id_unique",
    ).on(table.gameId, table.userId),
  }),
);

export const gameLevelRangeRequestRelations = relations(
  gameLevelRangeRequests,
  ({ one }) => ({
    game: one(games, {
      fields: [gameLevelRangeRequests.gameId],
      references: [games.id],
    }),
    user: one(user, {
      fields: [gameLevelRangeRequests.userId],
      references: [user.id],
    }),
    decidedBy: one(user, {
      fields: [gameLevelRangeRequests.decidedBy],
      references: [user.id],
      relationName: "gameLevelRangeRequestDecidedBy",
    }),
  }),
);
