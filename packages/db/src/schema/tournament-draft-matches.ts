import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { games } from "./games";
import { gameTeams } from "./game-teams";

/**
 * A drafted Pool Round pairing, seen only by Organizers until the Round is
 * posted. Posting inserts the Round's Matches and deletes its drafts; the
 * Court and start time come from `position` in the Round's schedule.
 */
export const tournamentDraftMatches = pgTable(
  "tournament_draft_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    position: integer("position").notNull(),
    slot1GameTeamId: uuid("slot_1_game_team_id")
      .notNull()
      .references(() => gameTeams.id, { onDelete: "cascade" }),
    slot2GameTeamId: uuid("slot_2_game_team_id")
      .notNull()
      .references(() => gameTeams.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueRoundPosition: unique(
      "tournament_draft_matches_game_round_position_unique",
    ).on(table.gameId, table.roundNumber, table.position),
    slot1Idx: index("tournament_draft_matches_slot_1_game_team_id_idx").on(
      table.slot1GameTeamId,
    ),
    slot2Idx: index("tournament_draft_matches_slot_2_game_team_id_idx").on(
      table.slot2GameTeamId,
    ),
  }),
);

export const tournamentDraftMatchRelations = relations(
  tournamentDraftMatches,
  ({ one }) => ({
    game: one(games, {
      fields: [tournamentDraftMatches.gameId],
      references: [games.id],
    }),
  }),
);
