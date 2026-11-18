import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { levelOverrides } from "./level-overrides";
import { user } from "./user";

export const LEVEL_DISPUTE_STATUS_VALUES = [
  "open",
  "upheld",
  "dismissed",
] as const;

export type LevelDisputeStatus = (typeof LEVEL_DISPUTE_STATUS_VALUES)[number];

export const levelDisputeStatuses = pgEnum(
  "level_dispute_status",
  LEVEL_DISPUTE_STATUS_VALUES,
);

export const LEVEL_DISPUTE_NOTE_MAX_LENGTH = 280;

/**
 * A Level dispute: a player's claim that a Level override of theirs is
 * wrong. An Operator upholds it, which puts the Level back where it was with
 * a new Level override (`restored_override_id`), or dismisses it. One
 * dispute per Level override, whatever became of it.
 */
export const levelDisputes = pgTable(
  "level_disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    levelOverrideId: uuid("level_override_id")
      .references(() => levelOverrides.id, { onDelete: "cascade" })
      .notNull(),
    raisedByUserId: uuid("raised_by_user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    note: varchar("note", { length: LEVEL_DISPUTE_NOTE_MAX_LENGTH }).notNull(),
    status: levelDisputeStatuses("status").notNull().default("open"),
    decidedByUserId: uuid("decided_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at"),
    /** The Level override an upheld dispute wrote to put the Level back. */
    restoredOverrideId: uuid("restored_override_id").references(
      () => levelOverrides.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { precision: 3 }).notNull().defaultNow(),
  },
  (table) => ({
    onePerOverride: uniqueIndex("level_disputes_level_override_unique").on(
      table.levelOverrideId,
    ),
    restoredOverrideIdx: index("level_disputes_restored_override_id_idx").on(
      table.restoredOverrideId,
    ),
    statusCreatedIdx: index("level_disputes_status_created_idx").on(
      table.status,
      table.createdAt,
    ),
  }),
);

export const levelDisputeRelations = relations(levelDisputes, ({ one }) => ({
  levelOverride: one(levelOverrides, {
    fields: [levelDisputes.levelOverrideId],
    references: [levelOverrides.id],
    relationName: "levelDisputeOverride",
  }),
  raisedBy: one(user, {
    fields: [levelDisputes.raisedByUserId],
    references: [user.id],
    relationName: "levelDisputeRaisedBy",
  }),
  decidedBy: one(user, {
    fields: [levelDisputes.decidedByUserId],
    references: [user.id],
    relationName: "levelDisputeDecidedBy",
  }),
}));
