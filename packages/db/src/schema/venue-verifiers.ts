import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { matches } from "./matches";
import { user } from "./user";
import { venues } from "./venues";

export const VENUE_VERIFIER_KIND_VALUES = [
  "club_staff",
  "referee",
  "coach",
] as const;

export const venueVerifierKinds = pgEnum(
  "venue_verifier_kind",
  VENUE_VERIFIER_KIND_VALUES,
);

/**
 * A Verifier: a User an Operator granted on one Venue as club staff, a
 * referee or a coach (ADR-0072). Removing the row ends the role; Level
 * overrides the Verifier already wrote keep their Venue.
 */
export const venueVerifiers = pgTable(
  "venue_verifiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    userId: uuid("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    kind: venueVerifierKinds("kind").notNull(),
    grantedByUserId: uuid("granted_by_user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    uniqueVenueUser: unique("venue_verifiers_venue_id_user_id_unique").on(
      table.venueId,
      table.userId,
    ),
    userIdx: index("venue_verifiers_user_id_idx").on(table.userId),
  }),
);

export const venueVerifierRelations = relations(venueVerifiers, ({ one }) => ({
  venue: one(venues, {
    fields: [venueVerifiers.venueId],
    references: [venues.id],
  }),
  user: one(user, {
    fields: [venueVerifiers.userId],
    references: [user.id],
    relationName: "venueVerifierUser",
  }),
  grantedBy: one(user, {
    fields: [venueVerifiers.grantedByUserId],
    references: [user.id],
    relationName: "venueVerifierGrantedBy",
  }),
}));

/**
 * A Verifier stamp: a Verifier's final confirmation of a Match at their Venue
 * as a neutral party (ADR-0072). One per Match. It completes the Match and
 * changes no weight. The Venue is kept so "Stamped by" still reads after the
 * role is removed.
 */
export const matchVerifierStamps = pgTable("match_verifier_stamps", {
  matchId: uuid("match_id")
    .primaryKey()
    .references(() => matches.id, { onDelete: "cascade" }),
  verifierUserId: uuid("verifier_user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  venueId: uuid("venue_id")
    .references(() => venues.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const matchVerifierStampRelations = relations(
  matchVerifierStamps,
  ({ one }) => ({
    match: one(matches, {
      fields: [matchVerifierStamps.matchId],
      references: [matches.id],
    }),
    verifier: one(user, {
      fields: [matchVerifierStamps.verifierUserId],
      references: [user.id],
      relationName: "matchVerifierStampVerifier",
    }),
    venue: one(venues, {
      fields: [matchVerifierStamps.venueId],
      references: [venues.id],
    }),
  }),
);
