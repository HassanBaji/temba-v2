import {
  boolean,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { groupSports } from "./group-enums";
import { groups } from "./groups";
import { ratingLevelBands } from "./ratings";
import { user } from "./user";

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

export const levelOverrides = pgTable(
  "level_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sport: groupSports().notNull(),
    setByUserId: uuid("set_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "set null",
    }),
    reason: levelOverrideReasons("reason"),
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
