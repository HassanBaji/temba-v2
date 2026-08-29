import { pgTable, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { user } from "./user";
import { teams } from "./teams";
import { gameInviteLinks } from "./game-invite-links";

export const gameInviteLinkConsents = pgTable(
  "game_invite_link_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameInviteLinkId: uuid("game_invite_link_id")
      .references(() => gameInviteLinks.id, { onDelete: "cascade" })
      .notNull(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueLinkUser: uniqueIndex(
      "game_invite_link_consents_link_id_user_id_unique",
    ).on(table.gameInviteLinkId, table.userId),
  }),
);

export const gameInviteLinkConsentRelations = relations(
  gameInviteLinkConsents,
  ({ one }) => ({
    inviteLink: one(gameInviteLinks, {
      fields: [gameInviteLinkConsents.gameInviteLinkId],
      references: [gameInviteLinks.id],
    }),
    team: one(teams, {
      fields: [gameInviteLinkConsents.teamId],
      references: [teams.id],
    }),
    user: one(user, {
      fields: [gameInviteLinkConsents.userId],
      references: [user.id],
    }),
  }),
);
