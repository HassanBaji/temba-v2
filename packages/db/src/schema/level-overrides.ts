import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { groupSports } from "./group-enums";
import { groups } from "./groups";
import { ratingLevelBands } from "./ratings";
import { user } from "./user";
import { venues } from "./venues";

export const LEVEL_OVERRIDE_REASON_VALUES = [
  "new_to_group",
  "plays_above_results",
  "plays_below_results",
  "back_from_injury",
  "correcting_a_mistake",
] as const;

export const levelOverrideReasons = pgEnum(
  "level_override_reason",
  LEVEL_OVERRIDE_REASON_VALUES,
);

/** Who set a Level override, by the door they used (ADR-0073). */
export const LEVEL_OVERRIDE_SET_BY_ROLE_VALUES = [
  "level_setter",
  "operator",
  "verifier",
] as const;

export const levelOverrideSetByRoles = pgEnum(
  "level_override_set_by_role",
  LEVEL_OVERRIDE_SET_BY_ROLE_VALUES,
);

export const LEVEL_OVERRIDE_NOTE_MAX_LENGTH = 280;

export const levelOverrides = pgTable(
  "level_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sport: groupSports().notNull(),
    setByUserId: uuid("set_by_user_id")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    setByRole: levelOverrideSetByRoles("set_by_role").notNull(),
    /** The Venue a Verifier calibrated from; null on every other door. */
    venueId: uuid("venue_id").references(() => venues.id, {
      onDelete: "set null",
    }),
    reason: levelOverrideReasons("reason"),
    note: varchar("note", { length: LEVEL_OVERRIDE_NOTE_MAX_LENGTH }),
    hadRating: boolean("had_rating").notNull(),
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
    userSportCreatedAt: index(
      "level_overrides_user_id_sport_created_at_idx",
    ).on(table.userId, table.sport, table.createdAt),
  }),
);

export const levelOverrideRelations = relations(levelOverrides, ({ one }) => ({
  venue: one(venues, {
    fields: [levelOverrides.venueId],
    references: [venues.id],
  }),
}));
