import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { groups } from "./groups";
import { groupSports, GroupSportEnum } from "./group-enums";
import { teamInviteLinks } from "./team-invite-links";
import { teamMemberInvites } from "./team-member-invites";
import { teamEmailInvites } from "./team-email-invites";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  sport: groupSports().notNull().default(GroupSportEnum.PADEL),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  groupId: uuid("group_id").references(() => groups.id, {
    onDelete: "set null",
  }),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamRelations = relations(teams, ({ one, many }) => ({
  createdBy: one(user, { fields: [teams.createdBy], references: [user.id] }),
  group: one(groups, { fields: [teams.groupId], references: [groups.id] }),
  memberInvites: many(teamMemberInvites),
  emailInvites: many(teamEmailInvites),
  inviteLinks: many(teamInviteLinks),
}));
