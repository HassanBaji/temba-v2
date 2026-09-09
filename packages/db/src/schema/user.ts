import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
  integer,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { account } from "./account";
import { session } from "./session";

/**
 * Preferred Position: a User's standing preference for left or right, or
 * either. A default for the Game seat picker, not a Position itself — kept
 * separate from `game_position`, which is the per-Game-team seat.
 */
export const USER_PREFERRED_POSITION_VALUES = [
  "left",
  "right",
  "either",
] as const;

export const userPreferredPositions = pgEnum(
  "user_preferred_position",
  USER_PREFERRED_POSITION_VALUES,
);

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id"),
    name: text("name").notNull(),
    email: text("email").unique(),
    username: text("username").unique(),
    displayUsername: text("display_username"),
    phoneNumber: text("phone_number").unique(),
    phoneNumberVerified: boolean("phone_number_verified")
      .$defaultFn(() => false)
      .notNull(),
    emailVerified: boolean("email_verified")
      .$defaultFn(() => false)
      .notNull(),
    image: varchar("image"),
    numberOfGamesPlayed: integer("number_of_games_played").notNull().default(0),
    numberOfCoachingSessions: integer("number_of_coaching_sessions")
      .notNull()
      .default(0),
    preferredPosition: userPreferredPositions("preferred_position"),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    clerkIdIdx: uniqueIndex("user_clerk_id_idx").on(table.clerkId),
    emailOrPhone: check(
      "user_email_or_phone_number",
      sql`${table.email} is not null or ${table.phoneNumber} is not null`,
    ),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
}));
