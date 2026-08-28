import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./user";
import { communities } from "./communities";
import { groupSports, GroupSportEnum } from "./group-enums";
import { teamInviteLinks } from "./team-invite-links";
import { teamMemberInvites } from "./team-member-invites";
import { teamEmailInvites } from "./team-email-invites";

export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }),
  sport: groupSports().notNull().default(GroupSportEnum.PADEL),
  communityId: uuid("community_id").references(() => communities.id, {
    onDelete: "restrict",
  }),
  createdBy: uuid("created_by")
    .references(() => user.id, { onDelete: "restrict" })
    .notNull(),
  gamesPlayed: integer("games_played").notNull().default(0),
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const teamRelations = relations(teams, ({ one, many }) => ({
  createdBy: one(user, { fields: [teams.createdBy], references: [user.id] }),
  community: one(communities, {
    fields: [teams.communityId],
    references: [communities.id],
  }),
  memberInvites: many(teamMemberInvites),
  emailInvites: many(teamEmailInvites),
  inviteLinks: many(teamInviteLinks),
}));
