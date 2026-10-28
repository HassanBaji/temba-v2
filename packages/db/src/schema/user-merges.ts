import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { user } from "./user";

export type UserMergeSummary = {
  seatsMoved: number;
  seatsDropped: number;
  membershipsMoved: number;
  ratingKeptBySport: Partial<
    Record<"padel" | "football", "survivor" | "merged">
  >;
};

/** Audit record of an Unclaimed player absorbed into an account (ADR-0042). */
export const userMerges = pgTable("user_merges", {
  id: uuid("id").primaryKey().defaultRandom(),
  survivorUserId: uuid("survivor_user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  // No foreign key: the merged row is deleted by the merge.
  mergedUserId: uuid("merged_user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  mergedAt: timestamp("merged_at").notNull().defaultNow(),
  summary: jsonb("summary").$type<UserMergeSummary>().notNull(),
});
