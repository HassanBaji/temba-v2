import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

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
