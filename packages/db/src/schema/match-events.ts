import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

import { matches } from "./matches";
import { user } from "./user";

export const MATCH_EVENT_KIND_VALUES = [
  "goal",
  "own_goal",
  "warning",
  "red_card",
] as const;

export const matchEventKinds = pgEnum(
  "match_event_kind",
  MATCH_EVENT_KIND_VALUES,
);

export const RED_CARD_REASON_VALUES = [
  "second_warning",
  "serious_foul",
  "violent_conduct",
  "dissent",
  "other",
] as const;

export const redCardReasons = pgEnum("red_card_reason", RED_CARD_REASON_VALUES);

/**
 * The Match log of a football Match: each goal, own goal, warning and red card
 * with the minute of the game and the time it was logged. Saved with the
 * Score and confirmed with it. `side_index` is the side the line counts for:
 * the scoring side for a goal and an own goal, the player's side for a card.
 * A goal's `user_id` is null when nobody saw who scored.
 */
export const matchEvents = pgTable(
  "match_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id")
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    kind: matchEventKinds("kind").notNull(),
    sideIndex: integer("side_index").notNull(),
    userId: uuid("user_id").references(() => user.id, {
      onDelete: "set null",
    }),
    minute: integer("minute").notNull(),
    loggedAt: timestamp("logged_at").notNull(),
    reason: redCardReasons("reason"),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    matchIdx: index("match_events_match_id_idx").on(
      table.matchId,
      table.position,
    ),
    sideCheck: check(
      "match_events_side_index_check",
      sql`${table.sideIndex} in (1, 2)`,
    ),
    minuteCheck: check(
      "match_events_minute_check",
      sql`${table.minute} between 0 and 999`,
    ),
    reasonCheck: check(
      "match_events_reason_check",
      sql`${table.reason} is null or ${table.kind} = 'red_card'`,
    ),
  }),
);

export const matchEventRelations = relations(matchEvents, ({ one }) => ({
  match: one(matches, {
    fields: [matchEvents.matchId],
    references: [matches.id],
  }),
  user: one(user, { fields: [matchEvents.userId], references: [user.id] }),
}));
