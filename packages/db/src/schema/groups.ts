import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { games } from "./games";
import { communities } from "./communities";
import {
  groupSports,
  groupTypes,
  GroupSportEnum,
  GroupTypeEnum,
} from "./group-enums";
import { relations } from "drizzle-orm";

export {
  groupSports,
  groupTypes,
  GroupSportEnum,
  GroupTypeEnum,
} from "./group-enums";

export const groups = pgTable("groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  description: varchar("description", { length: 255 }),
  totalGamesPlayed: integer("total_games_played").notNull().default(0),
  type: groupTypes().default(GroupTypeEnum.PRIVATE),
  sport: groupSports().default(GroupSportEnum.PADEL),
  communityId: uuid("community_id").references(() => communities.id, {
    onDelete: "restrict",
  }),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const groupRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(user, { fields: [groups.createdBy], references: [user.id] }),
  community: one(communities, {
    fields: [groups.communityId],
    references: [communities.id],
  }),
  games: many(games),
}));
