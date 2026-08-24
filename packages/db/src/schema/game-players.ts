import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { games } from "./games";
import { user } from "./user";
import { relations } from "drizzle-orm";
import { gameTeamPlayers } from "./game-team-players";

export const playerTypes = pgEnum("player_type", ["player", "guest"]);

export enum PlayerTypeEnum {
  PLAYER = "player",
  CAPTAIN = "captain",
  ADMIN = "admin",
  WAITLIST = "waitlist",
  GUEST = "guest",
}

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => user.id, { onDelete: "cascade" }),
    playerType: playerTypes().default(PlayerTypeEnum.PLAYER),
    name: varchar("name", { length: 255 }),
    addedBy: uuid("added_by")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    setsWon: integer("sets_won"),
    setsLost: integer("sets_lost"),
    paidAt: timestamp("paid_at"),
    paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }),
    selfPerformanceRating: integer("self_performance_rating"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdx: index("idx_user_id").on(table.userId),
    gameIdx: index("idx_game_id").on(table.gameId),
  }),
);

export const gamePlayerRelations = relations(gamePlayers, ({ one, many }) => ({
  game: one(games, { fields: [gamePlayers.gameId], references: [games.id] }),
  user: one(user, { fields: [gamePlayers.userId], references: [user.id] }),
  gameTeamPlayers: many(gameTeamPlayers),
  addedBy: one(user, { fields: [gamePlayers.addedBy], references: [user.id] }),
}));
