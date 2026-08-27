import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { user } from "./user";
import { teams } from "./teams";

export const teamMemberInvites = pgTable(
  "team_member_invites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .references(() => teams.id, { onDelete: "cascade" })
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
    unusedTeamUserUnique: uniqueIndex(
      "team_member_invites_unused_team_user_unique",
    )
      .on(table.teamId, table.userId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
    unusedTeamUnique: uniqueIndex("team_member_invites_unused_team_unique")
      .on(table.teamId)
      .where(sql`${table.acceptedAt} is null and ${table.revokedAt} is null`),
  }),
);

export const teamMemberInviteRelations = relations(
  teamMemberInvites,
  ({ one }) => ({
    team: one(teams, {
      fields: [teamMemberInvites.teamId],
      references: [teams.id],
    }),
    user: one(user, {
      fields: [teamMemberInvites.userId],
      references: [user.id],
    }),
    invitedBy: one(user, {
      fields: [teamMemberInvites.invitedBy],
      references: [user.id],
      relationName: "teamMemberInviteInviter",
    }),
  }),
);
