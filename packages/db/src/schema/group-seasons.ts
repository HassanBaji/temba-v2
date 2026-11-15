import {
  date,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

import { groups } from "./groups";
import { user } from "./user";

/**
 * A Season: a date window an admin sets on a Group, scoping its Standing to
 * the Matches played inside it. Dates are product-timezone days, inclusive
 * on both ends. Closing a Season early moves `endsOn` to the closing day and
 * stamps `closedAt`; a Season past its end date is closed without a stamp.
 */
export const groupSeasons = pgTable(
  "group_seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .references(() => groups.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 40 }).notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on").notNull(),
    closedAt: timestamp("closed_at"),
    closedBy: uuid("closed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdBy: uuid("created_by")
      .references(() => user.id, { onDelete: "restrict" })
      .notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    groupIdx: index("group_seasons_group_id_idx").on(table.groupId),
  }),
);

export const groupSeasonRelations = relations(groupSeasons, ({ one }) => ({
  group: one(groups, {
    fields: [groupSeasons.groupId],
    references: [groups.id],
  }),
}));
