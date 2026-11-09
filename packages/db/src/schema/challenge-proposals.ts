import {
  index,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { user } from "./user";
import { teams } from "./teams";
import { venues } from "./venues";
import { courts } from "./courts";
import { challenges } from "./challenges";
import { proposalStatuses } from "./challenge-enums";

/** One Team's answer to a Challenge: a Venue and a date-time. */
export const challengeProposals = pgTable(
  "challenge_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    proposedBy: uuid("proposed_by")
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    status: proposalStatuses("status").notNull().default("pending"),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    courtId: uuid("court_id").references(() => courts.id, {
      onDelete: "set null",
    }),
    startsAt: timestamp("starts_at").notNull(),
    /** Optional, copied to the Challenge Game. */
    pricePerPlayerFils: integer("price_per_player_fils"),
    /** Sent, or last changed, plus 48 hours. */
    expiresAt: timestamp("expires_at").notNull(),
    decidedBy: uuid("decided_by").references(() => user.id, {
      onDelete: "set null",
    }),
    decidedAt: timestamp("decided_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pendingTeamUnique: uniqueIndex("proposals_pending_team_uq")
      .on(table.challengeId, table.teamId)
      .where(sql`${table.status} = 'pending'`),
    challengeIdx: index("proposals_challenge_idx").on(
      table.challengeId,
      table.status,
    ),
  }),
);

export const challengeProposalRelations = relations(
  challengeProposals,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeProposals.challengeId],
      references: [challenges.id],
    }),
    team: one(teams, {
      fields: [challengeProposals.teamId],
      references: [teams.id],
    }),
    venue: one(venues, {
      fields: [challengeProposals.venueId],
      references: [venues.id],
    }),
  }),
);
