import { relations, sql } from "drizzle-orm";
import {
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { groups } from "./groups";
import { levelOverrideReasons } from "./level-overrides";
import { matches } from "./matches";
import { user } from "./user";

export const TIER_BAND_VALUES = ["safi", "kanaad", "hamour", "shark"] as const;

export const tierBands = pgEnum("tier_band", TIER_BAND_VALUES);

export const TIER_EVENT_KIND_VALUES = [
  "game",
  "adjustment",
  "band_change",
] as const;

export const tierEventKinds = pgEnum("tier_event_kind", TIER_EVENT_KIND_VALUES);

/**
 * A member's Tier points in one tier Group (ADR-0067): created by their first
 * tier Game or Tier adjustment, carried across Seasons.
 */
export const groupTierPoints = pgTable(
  "group_tier_points",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    points: integer("points").notNull().default(1200),
    gamesCounted: integer("games_counted").notNull().default(0),
    /** Set by a Tier adjustment, which ends a Provisional tier. */
    confirmedAt: timestamp("confirmed_at"),
    /** Stored only to detect a change of band and tell the member. */
    band: tierBands("band"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupUser: unique("group_tier_points_group_id_user_id_unique").on(
      table.groupId,
      table.userId,
    ),
    userIdx: index("group_tier_points_user_id_idx").on(table.userId),
  }),
);

export const groupTierPointsRelations = relations(
  groupTierPoints,
  ({ one }) => ({
    user: one(user, {
      fields: [groupTierPoints.userId],
      references: [user.id],
    }),
    group: one(groups, {
      fields: [groupTierPoints.groupId],
      references: [groups.id],
    }),
  }),
);

/** The append-only ledger behind Tier points; it outlives the points row. */
export const groupTierEvents = pgTable(
  "group_tier_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    kind: tierEventKinds("kind").notNull(),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "cascade",
    }),
    resultDelta: integer("result_delta").notNull().default(0),
    performanceDelta: integer("performance_delta").notNull().default(0),
    delta: integer("delta").notNull().default(0),
    pointsBefore: integer("points_before").notNull(),
    pointsAfter: integer("points_after").notNull(),
    ratingHundredths: integer("rating_hundredths"),
    usualHundredths: integer("usual_hundredths"),
    expectedScore: doublePrecision("expected_score"),
    bandBefore: tierBands("band_before"),
    bandAfter: tierBands("band_after"),
    placeAfter: integer("place_after"),
    rankedCount: integer("ranked_count"),
    setByUserId: uuid("set_by_user_id").references(() => user.id, {
      onDelete: "restrict",
    }),
    reason: levelOverrideReasons("reason"),
    note: varchar("note", { length: 140 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGameUserMatch: uniqueIndex("group_tier_events_user_id_match_id_game")
      .on(table.userId, table.matchId)
      .where(sql`${table.kind} = 'game'`),
    userGroupCreatedAt: index(
      "group_tier_events_user_id_group_id_created_at_idx",
    ).on(table.userId, table.groupId, table.createdAt),
    groupCreatedAt: index("group_tier_events_group_id_created_at_idx").on(
      table.groupId,
      table.createdAt,
    ),
    matchIdx: index("group_tier_events_match_id_idx").on(table.matchId),
    setByIdx: index("group_tier_events_set_by_user_id_idx").on(
      table.setByUserId,
    ),
  }),
);

export const groupTierEventsRelations = relations(
  groupTierEvents,
  ({ one }) => ({
    user: one(user, {
      fields: [groupTierEvents.userId],
      references: [user.id],
    }),
    match: one(matches, {
      fields: [groupTierEvents.matchId],
      references: [matches.id],
    }),
  }),
);
