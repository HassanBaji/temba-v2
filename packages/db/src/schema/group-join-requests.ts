import {
  index,
  jsonb,
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  unique,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { games } from "./games";
import { groups } from "./groups";

export const groupJoinRequestStatuses = pgEnum("group_join_request_status", [
  "pending",
  "approved",
  "rejected",
  "blocked",
]);

export enum GroupJoinRequestStatusEnum {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  BLOCKED = "blocked",
}

export const groupJoinRequestSources = pgEnum("group_join_request_source", [
  "invite_link",
  "group_page",
]);

export type GroupJoinRequestSource =
  (typeof groupJoinRequestSources.enumValues)[number];

/**
 * The seat a Game Invite link holder asked for while the Group decides: a
 * padel Position, or a football role and position. Null when the Game has
 * no seat to pick.
 */
export type GroupJoinRequestHeldSeat =
  | {
      kind: "position";
      sideIndex: number;
      position: "left" | "right" | "either";
    }
  | {
      kind: "football";
      role: "outfield" | "keeper";
      position: "def" | "mid" | "fwd";
    };

export const groupJoinRequests = pgTable(
  "group_join_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, {
        onDelete: "cascade",
      })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    status: groupJoinRequestStatuses()
      .notNull()
      .default(GroupJoinRequestStatusEnum.PENDING),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    note: varchar("note", { length: 280 }),
    source: groupJoinRequestSources(),
    invitedBy: uuid("invited_by").references(() => user.id, {
      onDelete: "set null",
    }),
    // A Seat hold (ADR-0057): the Game a link holder wants a seat on while
    // the Group decides, and when that hold lapses.
    heldGameId: uuid("held_game_id").references(() => games.id, {
      onDelete: "set null",
    }),
    seatHeldUntil: timestamp("seat_held_until"),
    heldSeat: jsonb("held_seat").$type<GroupJoinRequestHeldSeat>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueGroupUser: unique("group_join_requests_group_id_user_id_unique").on(
      table.groupId,
      table.userId,
    ),
    userIdx: index("group_join_requests_user_id_idx").on(table.userId),
  }),
);

export const groupJoinRequestRelations = relations(
  groupJoinRequests,
  ({ one }) => ({
    group: one(groups, {
      fields: [groupJoinRequests.groupId],
      references: [groups.id],
    }),
    user: one(user, {
      fields: [groupJoinRequests.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [groupJoinRequests.invitedBy],
      references: [user.id],
      relationName: "groupJoinRequestInviter",
    }),
    heldGame: one(games, {
      fields: [groupJoinRequests.heldGameId],
      references: [games.id],
    }),
  }),
);
