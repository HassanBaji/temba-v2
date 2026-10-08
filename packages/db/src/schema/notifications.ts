import {
  boolean,
  index,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { games } from "./games";
import { groups } from "./groups";
import { teams } from "./teams";
import { user } from "./user";

export const notificationTypes = pgEnum("notification_type", [
  "group_member_joined",
  "game_player_joined",
  "game_player_left",
  "game_finished",
]);

export const notificationAudiences = pgEnum("notification_audience", [
  "admin",
  "player",
]);

export enum NotificationTypeEnum {
  GROUP_MEMBER_JOINED = "group_member_joined",
  GAME_PLAYER_JOINED = "game_player_joined",
  GAME_PLAYER_LEFT = "game_player_left",
  GAME_FINISHED = "game_finished",
}

export enum NotificationAudienceEnum {
  ADMIN = "admin",
  PLAYER = "player",
}

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipientUserId: uuid("recipient_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    type: notificationTypes("type").notNull(),
    audience: notificationAudiences("audience").notNull().default("admin"),
    actorUserId: uuid("actor_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    partnerUserId: uuid("partner_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    teamId: uuid("team_id").references(() => teams.id, {
      onDelete: "set null",
    }),
    groupId: uuid("group_id").references(() => groups.id, {
      onDelete: "cascade",
    }),
    gameId: uuid("game_id").references(() => games.id, {
      onDelete: "cascade",
    }),
    viaWaitlist: boolean("via_waitlist").notNull().default(false),
    dedupeKey: varchar("dedupe_key", { length: 255 }),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    recipientCreatedIdx: index("notifications_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt.desc(),
      table.id.desc(),
    ),
    recipientUnreadIdx: index("notifications_recipient_unread_idx")
      .on(table.recipientUserId)
      .where(sql`${table.readAt} is null`),
    recipientDedupeUq: uniqueIndex("notifications_recipient_dedupe_uq").on(
      table.recipientUserId,
      table.dedupeKey,
    ),
  }),
);

export const notificationRelations = relations(notifications, ({ one }) => ({
  recipient: one(user, {
    fields: [notifications.recipientUserId],
    references: [user.id],
    relationName: "notificationRecipient",
  }),
  actor: one(user, {
    fields: [notifications.actorUserId],
    references: [user.id],
    relationName: "notificationActor",
  }),
  partner: one(user, {
    fields: [notifications.partnerUserId],
    references: [user.id],
    relationName: "notificationPartner",
  }),
  team: one(teams, {
    fields: [notifications.teamId],
    references: [teams.id],
  }),
  group: one(groups, {
    fields: [notifications.groupId],
    references: [groups.id],
  }),
  game: one(games, {
    fields: [notifications.gameId],
    references: [games.id],
  }),
}));
