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
import { matches } from "./matches";
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

export const ratingEvents = pgTable(
  "rating_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sport: groupSports().notNull(),
    matchId: uuid("match_id")
      .references(() => matches.id, { onDelete: "cascade" })
      .notNull(),
    outcomeScore: doublePrecision("outcome_score").notNull(),
    weight: doublePrecision("weight").notNull(),
    muBefore: doublePrecision("mu_before").notNull(),
    phiBefore: doublePrecision("phi_before").notNull(),
    sigmaBefore: doublePrecision("sigma_before").notNull(),
    muAfter: doublePrecision("mu_after").notNull(),
    phiAfter: doublePrecision("phi_after").notNull(),
    sigmaAfter: doublePrecision("sigma_after").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserMatch: unique("rating_events_user_id_match_id_unique").on(
      table.userId,
      table.matchId,
    ),
  }),
);

export const ratingEventRelations = relations(ratingEvents, ({ one }) => ({
  user: one(user, {
    fields: [ratingEvents.userId],
    references: [user.id],
  }),
  match: one(matches, {
    fields: [ratingEvents.matchId],
    references: [matches.id],
  }),
}));
