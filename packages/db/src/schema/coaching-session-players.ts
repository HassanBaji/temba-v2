import { pgTable, uuid, timestamp, integer } from "drizzle-orm/pg-core";
import { coachingSession } from "./coaching-session";
import { user } from "./user";
import { relations } from "drizzle-orm";

export const coachingSessionPlayers = pgTable("coaching_session_players", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachingSessionId: uuid("coaching_session_id")
    .references(() => coachingSession.id, { onDelete: "cascade" })
    .notNull(),
  userId: uuid("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coachingSessionPlayersRelations = relations(
  coachingSessionPlayers,
  ({ one }) => ({
    coachingSession: one(coachingSession, {
      fields: [coachingSessionPlayers.coachingSessionId],
      references: [coachingSession.id],
    }),
  }),
);
