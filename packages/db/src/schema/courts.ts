import { relations, sql } from "drizzle-orm";
import {
  index,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { groupSports, GroupSportEnum } from "./group-enums";
import { venues } from "./venues";
import { gameCourts } from "./game-courts";
import { matches } from "./matches";

/**
 * Named playing surface on a Venue. Match.courtId points here (ADR-0008);
 * deleting a Court must not cascade-delete Matches (FK is on delete set null).
 */
export const courts = pgTable(
  "courts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .references(() => venues.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    sport: groupSports().notNull().default(GroupSportEnum.PADEL),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    venueSportIdx: index("courts_venue_id_sport_idx").on(
      table.venueId,
      table.sport,
    ),
    venueNameUnique: uniqueIndex("courts_venue_id_name_unique").using(
      "btree",
      table.venueId,
      sql`lower(btrim(${table.name}))`,
    ),
  }),
);

export const courtRelations = relations(courts, ({ one, many }) => ({
  venue: one(venues, {
    fields: [courts.venueId],
    references: [venues.id],
  }),
  matches: many(matches),
  gameCourts: many(gameCourts),
}));
