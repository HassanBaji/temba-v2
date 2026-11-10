import { relations } from "drizzle-orm";
import {
  doublePrecision,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { groups } from "./groups";
import { matches } from "./matches";
import { ratingLevelBands } from "./ratings";
import { user } from "./user";

/**
 * A Group Level: a User's Glicko-2 Rating inside one Group (ADR-0053). The
 * sport is the Group's.
 */
export const groupRatings = pgTable(
  "group_ratings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    mu: doublePrecision("mu").notNull(),
    phi: doublePrecision("phi").notNull(),
    sigma: doublePrecision("sigma").notNull(),
    levelBand: ratingLevelBands("level_band").notNull(),
    lastRatedAt: timestamp("last_rated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserGroup: unique("group_ratings_user_id_group_id_unique").on(
      table.userId,
      table.groupId,
    ),
    groupIdx: index("group_ratings_group_id_idx").on(table.groupId),
  }),
);

export const groupRatingRelations = relations(groupRatings, ({ one }) => ({
  user: one(user, {
    fields: [groupRatings.userId],
    references: [user.id],
  }),
  group: one(groups, {
    fields: [groupRatings.groupId],
    references: [groups.id],
  }),
}));

export const groupRatingEvents = pgTable(
  "group_rating_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
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
    /** As on `rating_events`: restored by a wrong-score reversal. */
    levelBandBefore: ratingLevelBands("level_band_before"),
    lastRatedAtBefore: timestamp("last_rated_at_before"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserMatch: unique("group_rating_events_user_id_match_id_unique").on(
      table.userId,
      table.matchId,
    ),
    userGroupCreatedAt: index(
      "group_rating_events_user_id_group_id_created_at_idx",
    ).on(table.userId, table.groupId, table.createdAt),
    matchIdx: index("group_rating_events_match_id_idx").on(table.matchId),
  }),
);

export const groupRatingEventRelations = relations(
  groupRatingEvents,
  ({ one }) => ({
    user: one(user, {
      fields: [groupRatingEvents.userId],
      references: [user.id],
    }),
    match: one(matches, {
      fields: [groupRatingEvents.matchId],
      references: [matches.id],
    }),
  }),
);

/** A Group Level an Organizer set by hand, and its audit record. */
export const groupLevelOverrides = pgTable(
  "group_level_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    setByUserId: uuid("set_by_user_id")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    muBefore: doublePrecision("mu_before").notNull(),
    phiBefore: doublePrecision("phi_before").notNull(),
    sigmaBefore: doublePrecision("sigma_before").notNull(),
    levelBandBefore: ratingLevelBands("level_band_before").notNull(),
    muAfter: doublePrecision("mu_after").notNull(),
    phiAfter: doublePrecision("phi_after").notNull(),
    sigmaAfter: doublePrecision("sigma_after").notNull(),
    levelBandAfter: ratingLevelBands("level_band_after").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userGroupCreatedAt: index(
      "group_level_overrides_user_id_group_id_created_at_idx",
    ).on(table.userId, table.groupId, table.createdAt),
  }),
);

export const groupLevelOverrideRelations = relations(
  groupLevelOverrides,
  ({ one }) => ({
    setBy: one(user, {
      fields: [groupLevelOverrides.setByUserId],
      references: [user.id],
    }),
  }),
);
