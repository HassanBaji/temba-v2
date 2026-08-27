import {
  boolean,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { venues } from "./venues";
import { user } from "./user";
import { relations } from "drizzle-orm";
import { gamePlayers } from "./game-players";
import { gameTeams } from "./game-teams";
import { groups } from "./groups";

export const gameStatus = pgEnum("game_status", [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
]);

export const gameSports = pgEnum("game_sport", ["padel", "football"]);

export enum GameStatusEnum {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

export enum GameSportEnum {
  PADEL = "padel",
  Football = "football",
}

export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  courtId: uuid("court_id")
    .notNull()
    .references(() => venues.id, { onDelete: "cascade" }),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  durationInMinutes: integer("duration_in_minutes").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }),
  pricePerPlayer: decimal("price_per_player", { precision: 10, scale: 2 }),
  maxPlayers: integer("max_players"),
  status: gameStatus().default(GameStatusEnum.PENDING),
  sport: gameSports().default(GameSportEnum.PADEL),
  setsPlayed: integer("sets_played"),
  statusUpdatedAt: timestamp("status_updated_at"),
  createdBy: uuid("created_by")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  isPublic: boolean("is_public").notNull().default(false),
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "restrict",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameRelations = relations(games, ({ one, many }) => ({
  court: one(venues, { fields: [games.courtId], references: [venues.id] }),
  createdBy: one(user, { fields: [games.createdBy], references: [user.id] }),
  group: one(groups, { fields: [games.groupId], references: [groups.id] }),
  players: many(gamePlayers),
  teams: many(gameTeams),
}));
