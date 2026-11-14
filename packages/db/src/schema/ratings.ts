import { relations } from "drizzle-orm";
import {
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { groupSports } from "./group-enums";
import { matches } from "./matches";
import { user } from "./user";

export const RATING_LEVEL_BAND_VALUES = [
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
] as const;

export const ratingLevelBands = pgEnum(
  "rating_level_band",
  RATING_LEVEL_BAND_VALUES,
);

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
    /**
     * The Rating's Level band and last rated time before this Match, so a
     * wrong-score reversal restores them too. Null on events written before
     * these columns existed.
     */
    levelBandBefore: ratingLevelBands("level_band_before"),
    lastRatedAtBefore: timestamp("last_rated_at_before"),
    /**
     * A football event's step in OVR points, by part (ADR-0069). Null on
     * padel events and on a part that did not count.
     */
    resultPart: doublePrecision("result_part"),
    performancePart: doublePrecision("performance_part"),
    goalsPart: doublePrecision("goals_part"),
    mvpPart: doublePrecision("mvp_part"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserMatch: unique("rating_events_user_id_match_id_unique").on(
      table.userId,
      table.matchId,
    ),
    matchIdx: index("rating_events_match_id_idx").on(table.matchId),
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
