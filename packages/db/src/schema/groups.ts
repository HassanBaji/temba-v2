import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { games } from "./games";
import { relations } from "drizzle-orm";

export const groupTypes = pgEnum("group_type", ["public", "private"]);
export const groupSports = pgEnum("group_sport", ["padel", "football"]);

export enum GroupTypeEnum {
  PUBLIC = "public",
  PRIVATE = "private",
}

export enum GroupSportEnum {
  PADEL = "padel",
  FOOTBALL = "football",
}

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  description: varchar("description", { length: 255 }),
  totalGamesPlayed: integer("total_games_played").notNull().default(0),
  type: groupTypes().default(GroupTypeEnum.PRIVATE),
  sport: groupSports().default(GroupSportEnum.PADEL),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(user, { fields: [groups.createdBy], references: [user.id] }),
  games: many(games),
}));
