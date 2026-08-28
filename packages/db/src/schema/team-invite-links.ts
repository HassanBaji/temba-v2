import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { teams } from "./teams";

export const teamInviteLinks = pgTable("team_invite_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .references(() => teams.id, { onDelete: "cascade" })
    .notNull(),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamInviteLinkRelations = relations(
  teamInviteLinks,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamInviteLinks.teamId],
      references: [teams.id],
    }),
    createdBy: one(user, {
      fields: [teamInviteLinks.createdBy],
      references: [user.id],
    }),
  }),
);
