import { relations } from "drizzle-orm";
import {
  doublePrecision,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { groupSports } from "./group-enums";
import { user } from "./user";

export const ratingLevelBands = pgEnum("rating_level_band", [
  "D3",
  "D2",
  "D1",
  "C3",
  "C2",
  "C1",
  "B3",
  "B2",
  "B1",
  "A",
]);

export enum RatingLevelBandEnum {
  D3 = "D3",
  D2 = "D2",
  D1 = "D1",
  C3 = "C3",
  C2 = "C2",
  C1 = "C1",
  B3 = "B3",
  B2 = "B2",
  B1 = "B1",
  A = "A",
}

export const ratings = pgTable(
  "ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sport: groupSports().notNull(),
    mu: doublePrecision("mu").notNull(),
    phi: doublePrecision("phi").notNull(),
    sigma: doublePrecision("sigma").notNull(),
    levelBand: ratingLevelBands("level_band").notNull(),
    selfDeclaredAt: timestamp("self_declared_at"),
    lastRatedAt: timestamp("last_rated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserSport: unique("ratings_user_id_sport_unique").on(
      table.userId,
      table.sport,
    ),
  }),
);

export const ratingRelations = relations(ratings, ({ one }) => ({
  user: one(user, {
    fields: [ratings.userId],
    references: [user.id],
  }),
}));
