import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { footballBibs, footballTeamsMethods } from "./game-enums";
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
  },
  (table) => ({
    draftIdx: index("football_lineup_draft_players_draft_id_idx").on(
      table.draftId,
    ),
    uniqueGamePlayer: uniqueIndex(
      "football_lineup_draft_players_game_player_id_unique",
    ).on(table.gamePlayerId),
    sideCheck: check(
      "football_lineup_draft_players_side_index_check",
      sql`${table.sideIndex} in (1, 2)`,
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
