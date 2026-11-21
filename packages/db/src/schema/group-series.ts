import {
  index,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { groups } from "./groups";
import { user } from "./user";

export const SERIES_EMBLEM_VALUES = [
  "cup",
  "crown",
  "star",
  "bolt",
  "flame",
  "moon",
  "ball",
] as const;

export const seriesEmblems = pgEnum("series_emblem", SERIES_EMBLEM_VALUES);

export const SERIES_COLOUR_VALUES = [
  "gold",
  "red",
  "blue",
  "green",
  "purple",
  "teal",
] as const;

export const seriesColours = pgEnum("series_colour", SERIES_COLOUR_VALUES);

/**
 * A Series: a named, badged run of a Verified Group's Games (ADR-0105). Its
 * Editions and wins are computed from the Games that point at it. Name
 * uniqueness among running Series and the cap are checked by `series.create`
 * under the Group row lock, not by a constraint.
 */
export const groupSeries = pgTable(
  "group_series",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    emblem: seriesEmblems("emblem").notNull(),
    colour: seriesColours("colour").notNull(),
    endedAt: timestamp("ended_at"),
    endedBy: uuid("ended_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("group_series_group_id_idx").on(table.groupId),
  }),
);

export const groupSeriesRelations = relations(groupSeries, ({ one }) => ({
  group: one(groups, {
    fields: [groupSeries.groupId],
    references: [groups.id],
  }),
}));
