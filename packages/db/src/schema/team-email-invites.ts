import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { teams } from "./teams";

export const teamEmailInvites = pgTable(
  "team_email_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
      .notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    invitedBy: uuid("invited_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    token: varchar("token", { length: 64 }).notNull().unique(),
    acceptedAt: timestamp("accepted_at"),
    revokedAt: timestamp("revoked_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    unusedTeamEmailUnique: uniqueIndex(
      "team_email_invites_unused_team_email_unique",
    )
      .on(table.teamId, table.email)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
    unusedTeamUnique: uniqueIndex("team_email_invites_unused_team_unique")
      .on(table.teamId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const teamEmailInviteRelations = relations(
  teamEmailInvites,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamEmailInvites.teamId],
      references: [teams.id],
    }),
    user: one(user, {
      fields: [teamEmailInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [teamEmailInvites.invitedBy],
      references: [user.id],
      relationName: "teamEmailInviteInviter",
    }),
  }),
);
