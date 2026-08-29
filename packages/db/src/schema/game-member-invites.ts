import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { user } from "./user";
import { games } from "./games";

export const gameMemberInvites = pgTable(
  "game_member_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .references(() => games.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    invitedBy: uuid("invited_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    unusedGameUserUnique: uniqueIndex(
      "game_member_invites_unused_game_user_unique",
    )
      .on(table.gameId, table.userId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const gameMemberInviteRelations = relations(
  gameMemberInvites,
  ({ one }) => ({
    game: one(games, {
      fields: [gameMemberInvites.gameId],
      references: [games.id],
    }),
    user: one(user, {
      fields: [gameMemberInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [gameMemberInvites.invitedBy],
      references: [user.id],
      relationName: "gameMemberInviteInviter",
    }),
  }),
);
