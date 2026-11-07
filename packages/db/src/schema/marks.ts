import {
  check,
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { games } from "./games";
import { matches } from "./matches";
import { user } from "./user";

export const MARK_KIND_VALUES = [
  "dynamo",
  "let_him_cook",
  "mr_fumble",
  "sayed_malek",
  "clutch",
  "mr_ice",
  "smash_machine",
  "goal_machine",
  "great_wall",
  "comeback_king",
  "underdog",
  "good_game",
] as const;

export const markKinds = pgEnum("mark_kind", MARK_KIND_VALUES);

/**
 * A Mark one participant gave another on a completed Match. One per giver
 * per receiver per Match; the per-Match cap of three is enforced by the
 * giving door under the Match row lock.
 */
export const marks = pgTable(
  "marks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    giverUserId: uuid("giver_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    receiverUserId: uuid("receiver_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: markKinds("kind").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    oneMarkPerReceiver: unique("marks_match_giver_receiver_unique").on(
      table.matchId,
      table.giverUserId,
      table.receiverUserId,
    ),
    notSelf: check(
      "marks_not_self_check",
      sql`${table.giverUserId} <> ${table.receiverUserId}`,
    ),
    receiverIdx: index("marks_receiver_user_id_idx").on(table.receiverUserId),
    matchIdx: index("marks_match_id_idx").on(table.matchId),
  }),
);

export const markRelations = relations(marks, ({ one }) => ({
  match: one(matches, { fields: [marks.matchId], references: [matches.id] }),
  giver: one(user, {
    fields: [marks.giverUserId],
    references: [user.id],
    relationName: "markGiver",
  }),
  receiver: one(user, {
    fields: [marks.receiverUserId],
    references: [user.id],
    relationName: "markReceiver",
  }),
}));

/**
 * One MVP vote per voter per Game, changeable while the vote is open. The
 * tally stays hidden until the MVP question settles.
 */
export const gameMvpVotes = pgTable(
  "game_mvp_votes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    voterUserId: uuid("voter_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    candidateUserId: uuid("candidate_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    oneVote: unique("game_mvp_votes_game_voter_unique").on(
      table.gameId,
      table.voterUserId,
    ),
    notSelf: check(
      "game_mvp_votes_not_self_check",
      sql`${table.voterUserId} <> ${table.candidateUserId}`,
    ),
  }),
);

export const gameMvpVoteRelations = relations(gameMvpVotes, ({ one }) => ({
  game: one(games, { fields: [gameMvpVotes.gameId], references: [games.id] }),
  voter: one(user, {
    fields: [gameMvpVotes.voterUserId],
    references: [user.id],
  }),
  candidate: one(user, {
    fields: [gameMvpVotes.candidateUserId],
    references: [user.id],
  }),
}));
