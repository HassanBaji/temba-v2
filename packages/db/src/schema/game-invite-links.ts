import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./user";
import { games } from "./games";
import { gameInviteLinkConsents } from "./game-invite-link-consents";

export const gameInviteLinks = pgTable("game_invite_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  gameId: uuid("game_id")
    .references(() => games.id, { onDelete: "cascade" })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  shortCode: varchar("short_code", { length: 8 }).unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const gameInviteLinkRelations = relations(
  gameInviteLinks,
  ({ one, many }) => ({
    game: one(games, {
      fields: [gameInviteLinks.gameId],
      references: [games.id],
    }),
    createdBy: one(user, {
      fields: [gameInviteLinks.createdBy],
      references: [user.id],
    }),
    consents: many(gameInviteLinkConsents),
  }),
);
