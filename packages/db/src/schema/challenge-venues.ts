import { integer, pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { challenges } from "./challenges";
import { venues } from "./venues";

/** A Challenge's preferred Venues, in the order the poster picked them. */
export const challengeVenues = pgTable(
  "challenge_venues",
  {
    challengeId: uuid("challenge_id")
      .notNull()
      .references(() => challenges.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    rank: integer("rank").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.challengeId, table.venueId] }),
  }),
);

export const challengeVenueRelations = relations(
  challengeVenues,
  ({ one }) => ({
    challenge: one(challenges, {
      fields: [challengeVenues.challengeId],
      references: [challenges.id],
    }),
    venue: one(venues, {
      fields: [challengeVenues.venueId],
      references: [venues.id],
    }),
  }),
);
