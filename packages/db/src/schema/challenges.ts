import {
  type AnyPgColumn,
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { user } from "./user";
import { teams } from "./teams";
import { games } from "./games";
import { groupSports } from "./group-enums";
import {
  challengeStatuses,
  challengeTimings,
  weekdays,
} from "./challenge-enums";
import { challengeVenues } from "./challenge-venues";
import { challengeProposals } from "./challenge-proposals";

/** A Team's open request for an opponent. A request, never a Game. */
export const challenges = pgTable(
  "challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    /** The Team's sport when the Challenge was posted. */
    sport: groupSports("sport").notNull(),
    status: challengeStatuses("status").notNull().default("open"),
    postedBy: uuid("posted_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    /** Level wanted, inclusive, in the same tenths as a Game Level range. */
    levelMinTenths: integer("level_min_tenths"),
    levelMaxTenths: integer("level_max_tenths"),
    /** Empty means any day. */
    days: weekdays("days")
      .array()
      .notNull()
      .default(sql`'{}'`),
    /** Empty means any time. */
    timings: challengeTimings("timings")
      .array()
      .notNull()
      .default(sql`'{}'`),
    exactSlots: timestamp("exact_slots")
      .array()
      .notNull()
      .default(sql`'{}'`),
    durationMinutes: integer("duration_minutes").notNull(),
    /** The Challenge format: football only. */
    sideSize: integer("side_size"),
    note: varchar("note", { length: 140 }),
    nudgeTeamId: uuid("nudge_team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at").notNull(),
    confirmedProposalId: uuid("confirmed_proposal_id").references(
      (): AnyPgColumn => challengeProposals.id,
      { onDelete: "set null" },
    ),
    gameId: uuid("game_id").references(() => games.id, {
      onDelete: "set null",
    }),
    withdrawnAt: timestamp("withdrawn_at"),
    expiredAt: timestamp("expired_at"),
    confirmedAt: timestamp("confirmed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    openBoardIdx: index("challenges_open_board_idx").on(
      table.status,
      table.sport,
      table.expiresAt,
    ),
    teamOpenUnique: uniqueIndex("challenges_team_open_uq")
      .on(table.teamId)
      .where(sql`${table.status} = 'open'`),
    sideSizeCheck: check(
      "challenges_side_size_check",
      sql`${table.sideSize} is null or ${table.sideSize} in (5, 6, 7)`,
    ),
  }),
);

export const challengeRelations = relations(challenges, ({ one, many }) => ({
  team: one(teams, { fields: [challenges.teamId], references: [teams.id] }),
  postedBy: one(user, {
    fields: [challenges.postedBy],
    references: [user.id],
  }),
  game: one(games, { fields: [challenges.gameId], references: [games.id] }),
  venues: many(challengeVenues),
  proposals: many(challengeProposals),
}));
