import { relations } from "drizzle-orm";
import { index, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";

import { venues } from "./venues";

/**
 * A photo a Venue manager uploaded for the Venue. The bytes live in the bucket
 * under `venue-photos/<venueId>/<id>` (ADR-0032); the row only records that
 * the object exists. Venue.coverPhotoId and Venue.detailPhotoId pick from these.
 */
export const venuePhotos = pgTable(
  "venue_photos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    venueCreatedIdx: index("venue_photos_venue_id_created_at_idx").on(
      table.venueId,
      table.createdAt,
    ),
  }),
);

export const venuePhotosRelations = relations(venuePhotos, ({ one }) => ({
  venue: one(venues, {
    fields: [venuePhotos.venueId],
    references: [venues.id],
  }),
}));
