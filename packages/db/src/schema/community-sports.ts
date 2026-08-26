import { pgTable, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { communities } from "./communities";
import { groupSports } from "./group-enums";

export const communitySports = pgTable(
  "community_sports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    communityId: uuid("community_id")
      .references(() => communities.id, { onDelete: "cascade" })
      .notNull(),
    sport: groupSports().notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueCommunitySport: unique(
      "community_sports_community_id_sport_unique",
    ).on(table.communityId, table.sport),
  }),
);

export const communitySportRelations = relations(
  communitySports,
  ({ one }) => ({
    community: one(communities, {
      fields: [communitySports.communityId],
      references: [communities.id],
    }),
  }),
);
