import { relations, sql } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { matches } from "./matches";
import { user } from "./user";

export const MATCH_DISPUTE_STATUS_VALUES = [
  "open",
  "upheld",
  "dismissed",
] as const;

export type MatchDisputeStatus = (typeof MATCH_DISPUTE_STATUS_VALUES)[number];

export const matchDisputeStatuses = pgEnum(
  "match_dispute_status",
  MATCH_DISPUTE_STATUS_VALUES,
);

export const MATCH_DISPUTE_NOTE_MAX_LENGTH = 280;

/**
 * A Match dispute: a seated player's claim that a Match that counted for
 * Temba Level is wrong. An Operator upholds it, which runs the wrong-score
 * reversal, or dismisses it. One open dispute per Match.
 */
export const matchDisputes = pgTable(
  "match_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .references(() => matches.id, { onDelete: "cascade" })
      .notNull(),
    raisedByUserId: uuid("raised_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    note: varchar("note", { length: MATCH_DISPUTE_NOTE_MAX_LENGTH }).notNull(),
    status: matchDisputeStatuses("status").notNull().default("open"),
    decidedByUserId: uuid("decided_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    matchIdx: index("match_disputes_match_id_idx").on(table.matchId),
    openPerMatch: uniqueIndex("match_disputes_open_match_unique")
      .on(table.matchId)
      .where(sql`${table.status} = 'open'`),
    statusCreatedIdx: index("match_disputes_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const matchDisputeRelations = relations(matchDisputes, ({ one }) => ({
  match: one(matches, {
    fields: [matchDisputes.matchId],
    references: [matches.id],
  }),
  raisedBy: one(user, {
    fields: [matchDisputes.raisedByUserId],
    references: [user.id],
    relationName: "matchDisputeRaisedBy",
  }),
  decidedBy: one(user, {
    fields: [matchDisputes.decidedByUserId],
    references: [user.id],
    relationName: "matchDisputeDecidedBy",
  }),
}));
