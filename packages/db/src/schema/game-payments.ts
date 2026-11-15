import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { games } from "./games";
import { user } from "./user";

export const GAME_PAYMENT_STATUS_VALUES = [
  "claimed",
  "paid",
  "not_received",
] as const;

export const gamePaymentStatuses = pgEnum(
  "game_payment_status",
  GAME_PAYMENT_STATUS_VALUES,
);

export const GAME_PAYMENT_RETURN_REASON_VALUES = [
  "nothing_arrived",
  "wrong_amount",
  "sent_elsewhere",
] as const;

export const gamePaymentReturnReasons = pgEnum(
  "game_payment_return_reason",
  GAME_PAYMENT_RETURN_REASON_VALUES,
);

export const GAME_PAYMENT_NOTE_MAX_LENGTH = 200;

/**
 * Who has paid the Organizer for a Game that tracks payments. No row means
 * not paid yet. Temba moves no money: a player claims, and only the
 * Organizer or a Group admin makes it `paid`.
 */
export const gamePayments = pgTable(
  "game_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    status: gamePaymentStatuses("status").notNull(),
    claimedAt: timestamp("claimed_at"),
    paidAt: timestamp("paid_at"),
    paidByUserId: uuid("paid_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    returnedAt: timestamp("returned_at"),
    returnedByUserId: uuid("returned_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    returnReason: gamePaymentReturnReasons("return_reason"),
    returnNote: varchar("return_note", {
      length: GAME_PAYMENT_NOTE_MAX_LENGTH,
    }),
    updatedByUserId: uuid("updated_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGameUser: unique("game_payments_game_id_user_id_unique").on(
      table.gameId,
      table.userId,
    ),
    userIdx: index("game_payments_user_id_idx").on(table.userId),
  }),
);

export const gamePaymentRelations = relations(gamePayments, ({ one }) => ({
  game: one(games, { fields: [gamePayments.gameId], references: [games.id] }),
  user: one(user, { fields: [gamePayments.userId], references: [user.id] }),
}));

export const GAME_PAYMENT_EVENT_ACTION_VALUES = [
  "claimed",
  "unclaimed",
  "paid",
  "not_received",
  "undone",
] as const;

export const gamePaymentEventActions = pgEnum(
  "game_payment_event_action",
  GAME_PAYMENT_EVENT_ACTION_VALUES,
);

/** Every change to a player's payment, with who made it. Never rewritten. */
export const gamePaymentEvents = pgTable(
  "game_payment_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    action: gamePaymentEventActions("action").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    gameIdx: index("game_payment_events_game_id_idx").on(
      table.gameId,
      table.createdAt,
    ),
    userIdx: index("game_payment_events_user_id_idx").on(table.userId),
  }),
);
