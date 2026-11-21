import {
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

import {
  footballBibs,
  footballDraftAnswers,
  footballFirstPicks,
  footballPickStatuses,
  footballTeamsMethods,
} from "./game-enums";
import { gamePlayers } from "./game-players";
import { games } from "./games";
import { user } from "./user";

// A Draft line-up (ADR-0107): kept apart from game_teams so that no reader of
// a Game's teams sees it.
export const footballLineupDrafts = pgTable(
  "football_lineup_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    method: footballTeamsMethods("method").notNull(),
    slot1Bib: footballBibs("slot1_bib").notNull(),
    slot2Bib: footballBibs("slot2_bib").notNull(),
    // Side captains (ADR-0108), cleared when they leave the Game.
    slot1CaptainGamePlayerId: uuid("slot1_captain_game_player_id").references(
      () => gamePlayers.id,
      { onDelete: "set null" },
    ),
    slot2CaptainGamePlayerId: uuid("slot2_captain_game_player_id").references(
      () => gamePlayers.id,
      { onDelete: "set null" },
    ),
    // A Captain pick (ADR-0109): null outside one. The side on turn is read
    // from the sides, never stored.
    pickStatus: footballPickStatuses("pick_status"),
    firstPick: footballFirstPicks("first_pick"),
    firstPickSide: integer("first_pick_side"),
    // Pick room presence: a Side captain is in the room while their screen
    // polls.
    slot1CaptainSeenAt: timestamp("slot1_captain_seen_at"),
    slot2CaptainSeenAt: timestamp("slot2_captain_seen_at"),
    savedBy: uuid("saved_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    savedAt: timestamp("saved_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    // The concurrency token a save or a publish names.
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGame: uniqueIndex("football_lineup_drafts_game_id_unique").on(
      table.gameId,
    ),
    bibsDiffer: check(
      "football_lineup_drafts_bibs_differ_check",
      sql`${table.slot1Bib} <> ${table.slot2Bib}`,
    ),
    slot1CaptainIdx: index(
      "football_lineup_drafts_slot1_captain_game_player_id_idx",
    ).on(table.slot1CaptainGamePlayerId),
    slot2CaptainIdx: index(
      "football_lineup_drafts_slot2_captain_game_player_id_idx",
    ).on(table.slot2CaptainGamePlayerId),
    firstPickSideCheck: check(
      "football_lineup_drafts_first_pick_side_check",
      sql`${table.firstPickSide} is null or ${table.firstPickSide} in (1, 2)`,
    ),
  }),
);

// A Game player sits on one side of the draft at most, and leaves it with the
// Game by cascade.
export const footballLineupDraftPlayers = pgTable(
  "football_lineup_draft_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => footballLineupDrafts.id, { onDelete: "cascade" }),
    gamePlayerId: uuid("game_player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    sideIndex: integer("side_index").notNull(),
    // Set by a Captain pick; a Side captain seated on opening has none.
    pickNumber: integer("pick_number"),
  },
  (table) => ({
    draftIdx: index("football_lineup_draft_players_draft_id_idx").on(
      table.draftId,
    ),
    uniquePickNumber: uniqueIndex(
      "football_lineup_draft_players_pick_number_unique",
    )
      .on(table.draftId, table.pickNumber)
      .where(sql`${table.pickNumber} is not null`),
    uniqueGamePlayer: uniqueIndex(
      "football_lineup_draft_players_game_player_id_unique",
    ).on(table.gamePlayerId),
    sideCheck: check(
      "football_lineup_draft_players_side_index_check",
      sql`${table.sideIndex} in (1, 2)`,
    ),
  }),
);

// A Captain's answer (ADR-0108) keeps the side's players it was given for, so
// a side that has changed since reads as waiting without any door resetting it.
export const footballLineupDraftAnswers = pgTable(
  "football_lineup_draft_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    draftId: uuid("draft_id")
      .notNull()
      .references(() => footballLineupDrafts.id, { onDelete: "cascade" }),
    sideIndex: integer("side_index").notNull(),
    captainUserId: uuid("captain_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    answer: footballDraftAnswers("answer").notNull(),
    note: varchar("note", { length: 140 }),
    answeredPlayerIds: uuid("answered_player_ids").array().notNull(),
    answeredAt: timestamp("answered_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueSide: uniqueIndex(
      "football_lineup_draft_answers_draft_side_unique",
    ).on(table.draftId, table.sideIndex),
    captainIdx: index("football_lineup_draft_answers_captain_user_id_idx").on(
      table.captainUserId,
    ),
    sideCheck: check(
      "football_lineup_draft_answers_side_index_check",
      sql`${table.sideIndex} in (1, 2)`,
    ),
    noteWithChange: check(
      "football_lineup_draft_answers_note_check",
      sql`${table.answer} <> 'change_asked' or ${table.note} is not null`,
    ),
  }),
);

export const footballLineupDraftRelations = relations(
  footballLineupDrafts,
  ({ one, many }) => ({
    game: one(games, {
      fields: [footballLineupDrafts.gameId],
      references: [games.id],
    }),
    savedBy: one(user, {
      fields: [footballLineupDrafts.savedBy],
      references: [user.id],
    }),
    players: many(footballLineupDraftPlayers),
    answers: many(footballLineupDraftAnswers),
  }),
);

export const footballLineupDraftPlayerRelations = relations(
  footballLineupDraftPlayers,
  ({ one }) => ({
    draft: one(footballLineupDrafts, {
      fields: [footballLineupDraftPlayers.draftId],
      references: [footballLineupDrafts.id],
    }),
    gamePlayer: one(gamePlayers, {
      fields: [footballLineupDraftPlayers.gamePlayerId],
      references: [gamePlayers.id],
    }),
  }),
);

export const footballLineupDraftAnswerRelations = relations(
  footballLineupDraftAnswers,
  ({ one }) => ({
    draft: one(footballLineupDrafts, {
      fields: [footballLineupDraftAnswers.draftId],
      references: [footballLineupDrafts.id],
    }),
    captain: one(user, {
      fields: [footballLineupDraftAnswers.captainUserId],
      references: [user.id],
    }),
  }),
);
