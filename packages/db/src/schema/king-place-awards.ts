import {
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { games } from "./games";
import { groupSports } from "./group-enums";
import { ratingLevelBands } from "./ratings";
import { user } from "./user";

/**
 * A Place award (ADR-0089): what a King of the court Final order moved for
 * one player of a Game team placed first to fourth. Not a Rated Match, so it
 * has its own ledger beside `rating_events` and `level_overrides`.
 */
export const kingPlaceAwards = pgTable(
  "king_place_awards",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    sport: groupSports().notNull(),
    gameId: uuid("game_id")
      .references(() => games.id, { onDelete: "cascade" })
      .notNull(),
    finalPlace: integer("final_place").notNull(),
    /** How many wins against the field the place counted for. */
    wins: doublePrecision("wins").notNull(),
    /** The field the wins were against: the mean μ and φ of everyone on a court. */
    fieldMu: doublePrecision("field_mu").notNull(),
    fieldPhi: doublePrecision("field_phi").notNull(),
    muBefore: doublePrecision("mu_before").notNull(),
    phiBefore: doublePrecision("phi_before").notNull(),
    sigmaBefore: doublePrecision("sigma_before").notNull(),
    muAfter: doublePrecision("mu_after").notNull(),
    phiAfter: doublePrecision("phi_after").notNull(),
    sigmaAfter: doublePrecision("sigma_after").notNull(),
    levelBandBefore: ratingLevelBands("level_band_before").notNull(),
    lastRatedAtBefore: timestamp("last_rated_at_before"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueUserGame: unique("king_place_awards_user_id_game_id_unique").on(
      table.userId,
      table.gameId,
    ),
    gameIdx: index("king_place_awards_game_id_idx").on(table.gameId),
  }),
);
