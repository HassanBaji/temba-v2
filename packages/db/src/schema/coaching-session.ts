import { pgTable, uuid, timestamp, integer, pgEnum } from "drizzle-orm/pg-core";
import { coach } from "./coach";
import { venues } from "./venues";
import { relations } from "drizzle-orm";

export const coachingSessionStatus = pgEnum("coaching_session_status", [
  "pending",
  "confirmed",
  "cancelled",
]);

export enum CoachingSessionStatusEnum {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

export const coachingSession = pgTable("coaching_session", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id")
    .references(() => coach.id, { onDelete: "cascade" })
    .notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  durationInMinutes: integer("duration_in_minutes").notNull(),
  price: integer("price").notNull(),
  status: coachingSessionStatus().default(CoachingSessionStatusEnum.PENDING),
  courtId: uuid("court_id")
    .references(() => venues.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coachingSessionRelations = relations(
  coachingSession,
  ({ one }) => ({
    coach: one(coach, {
      fields: [coachingSession.coachId],
      references: [coach.id],
    }),
  }),
);
