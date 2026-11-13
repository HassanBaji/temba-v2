import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
  boolean,
  check,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { games } from "./games";
import { venues } from "./venues";
import {
  groupSports,
  groupTypes,
  GroupSportEnum,
  GroupTypeEnum,
  performanceRatingModes,
} from "./group-enums";
import { relations, sql } from "drizzle-orm";
import { groupMemberInvites } from "./group-member-invites";
import { groupEmailInvites } from "./group-email-invites";
import { groupInviteLinks } from "./group-invite-links";
import { groupJoinRequests } from "./group-join-requests";
import { groupSeasons } from "./group-seasons";

export {
  groupSports,
  groupTypes,
  GroupSportEnum,
  GroupTypeEnum,
  PERFORMANCE_RATING_MODE_VALUES,
  performanceRatingModes,
} from "./group-enums";

export const groups = pgTable(
  "groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }),
    description: varchar("description", { length: 255 }),
    totalGamesPlayed: integer("total_games_played").notNull().default(0),
    type: groupTypes().notNull().default(GroupTypeEnum.PRIVATE),
    sport: groupSports().default(GroupSportEnum.PADEL),
    venueId: uuid("venue_id").references(() => venues.id, {
      onDelete: "restrict",
    }),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    imageUrl: varchar("image_url", { length: 255 }),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    verifiedAt: timestamp("verified_at"),
    verifiedBy: uuid("verified_by").references(() => user.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at"),
    deletedBy: uuid("deleted_by").references(() => user.id, {
      onDelete: "set null",
    }),
    /** Rating settings of a tier Group (ADR-0068); unused on any other Group. */
    performanceRatingMode: performanceRatingModes("performance_rating_mode")
      .notNull()
      .default("off"),
    performanceWeightPercent: integer("performance_weight_percent")
      .notNull()
      .default(30),
    organizerCountsDouble: boolean("organizer_counts_double")
      .notNull()
      .default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    performanceWeightCheck: check(
      "groups_performance_weight_percent_check",
      sql`${table.performanceWeightPercent} in (20, 30, 50)`,
    ),
  }),
);

export const groupRelations = relations(groups, ({ one, many }) => ({
  createdBy: one(user, { fields: [groups.createdBy], references: [user.id] }),
  venue: one(venues, {
    fields: [groups.venueId],
    references: [venues.id],
  }),
  games: many(games),
  memberInvites: many(groupMemberInvites),
  emailInvites: many(groupEmailInvites),
  inviteLinks: many(groupInviteLinks),
  joinRequests: many(groupJoinRequests),
  seasons: many(groupSeasons),
}));
