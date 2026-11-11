import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { courts } from "./courts";
import { games } from "./games";
import { gameTeams } from "./game-teams";
import { matchSets } from "./match-sets";
import { matchGoals } from "./match-goals";
import { marks } from "./marks";
import { matchResultConfirmations } from "./match-result-confirmations";
import { gameStatus, MatchStatusEnum } from "./game-enums";

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    courtId: uuid("court_id").references(() => courts.id, {
      onDelete: "set null",
    }),
    startTime: timestamp("start_time"),
    endTime: timestamp("end_time"),
    durationInMinutes: integer("duration_in_minutes"),
    status: gameStatus("status").default(MatchStatusEnum.PENDING),
    slot1GameTeamId: uuid("slot_1_game_team_id").references(
      () => gameTeams.id,
      {
        onDelete: "set null",
      },
    ),
    slot2GameTeamId: uuid("slot_2_game_team_id").references(
      () => gameTeams.id,
      {
        onDelete: "set null",
      },
    ),
    roundNumber: integer("round_number"),
    knockoutRound: integer("knockout_round"),
    knockoutPosition: integer("knockout_position"),
    slot1SourcePoolIndex: integer("slot_1_source_pool_index"),
    slot1SourcePoolPosition: integer("slot_1_source_pool_position"),
    slot2SourcePoolIndex: integer("slot_2_source_pool_index"),
    slot2SourcePoolPosition: integer("slot_2_source_pool_position"),
    walkoverGameTeamId: uuid("walkover_game_team_id").references(
      () => gameTeams.id,
      { onDelete: "set null" },
    ),
    /** Set with `status = completed`, cleared when a wrong score reopens the Match. Anchors the Marks window. */
    completedAt: timestamp("completed_at"),
    /** A Match its players stopped before a result. No result, out of the table until a score replaces it. */
    notFinishedAt: timestamp("not_finished_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    gameIdx: index("matches_game_id_idx").on(table.gameId),
    slot1Idx: index("matches_slot_1_game_team_id_idx").on(
      table.slot1GameTeamId,
    ),
    slot2Idx: index("matches_slot_2_game_team_id_idx").on(
      table.slot2GameTeamId,
    ),
    walkoverIdx: index("matches_walkover_game_team_id_idx").on(
      table.walkoverGameTeamId,
    ),
    knockoutPlaceUnique: uniqueIndex("matches_game_id_knockout_place_unique")
      .on(table.gameId, table.knockoutRound, table.knockoutPosition)
      .where(sql`${table.knockoutRound} is not null`),
    // A posted Pool Round pairs two Game teams once, whichever slot each holds.
    poolPairingUnique: uniqueIndex("matches_game_id_pool_round_pairing_unique")
      .on(
        table.gameId,
        table.roundNumber,
        sql`least(${table.slot1GameTeamId}, ${table.slot2GameTeamId})`,
        sql`greatest(${table.slot1GameTeamId}, ${table.slot2GameTeamId})`,
      )
      .where(
        sql`${table.roundNumber} is not null and ${table.knockoutRound} is null`,
      ),
  }),
);

export const matchRelations = relations(matches, ({ one, many }) => ({
  game: one(games, { fields: [matches.gameId], references: [games.id] }),
  court: one(courts, { fields: [matches.courtId], references: [courts.id] }),
  slot1GameTeam: one(gameTeams, {
    fields: [matches.slot1GameTeamId],
    references: [gameTeams.id],
    relationName: "matchSlot1",
  }),
  slot2GameTeam: one(gameTeams, {
    fields: [matches.slot2GameTeamId],
    references: [gameTeams.id],
    relationName: "matchSlot2",
  }),
  sets: many(matchSets),
  goals: many(matchGoals),
  confirmations: many(matchResultConfirmations),
  marks: many(marks),
}));
