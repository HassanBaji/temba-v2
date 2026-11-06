import {
  date,
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
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { account } from "./account";
import { footballPositions, footballRoles } from "./game-enums";
import { groupSports } from "./group-enums";
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

export const USER_GENDER_VALUES = ["male", "female", "unspecified"] as const;

export const userGenders = pgEnum("user_gender", USER_GENDER_VALUES);

/** Weekend is Friday and Saturday; morning is before noon, evening after 6 PM. */
export const PLAY_WINDOW_VALUES = [
  "weekday_morning",
  "weekday_afternoon",
  "weekday_evening",
  "weekend_morning",
  "weekend_afternoon",
  "weekend_evening",
] as const;

export const playWindows = pgEnum("play_window", PLAY_WINDOW_VALUES);

export const MATCH_HISTORY_VISIBILITY_VALUES = [
  "everyone",
  "group_members",
  "only_me",
] as const;

export const matchHistoryVisibilities = pgEnum(
  "match_history_visibility",
  MATCH_HISTORY_VISIBILITY_VALUES,
);

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id"),
    /** "First Last", or the username / email / phone fallback a legacy account has (ADR-0049). */
    name: text("name").notNull(),
    firstName: text("first_name"),
    lastName: text("last_name"),
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
    /**
     * The sports the User told onboarding they play. Null for a User who
     * onboarded before the question existed, who is read as padel only.
     */
    sports: groupSports("sports").array(),
    /** Football defaults for the join sheet; each Game registration keeps its own. */
    preferredFootballRole: footballRoles("preferred_football_role"),
    preferredFootballPosition: footballPositions("preferred_football_position"),
    onboardingCompletedAt: timestamp("onboarding_completed_at"),
    gender: userGenders("gender"),
    birthDate: date("birth_date", { mode: "string" }),
    /** An area name such as "Seef", never an address. */
    homeArea: text("home_area"),
    /** ISO 3166-1 alpha-2 code of the nationality. */
    nationality: varchar("nationality", { length: 2 }),
    playWindows: playWindows("play_windows").array(),
    seatAlerts: boolean("seat_alerts").notNull().default(false),
    /** Email notifications (ADR-0054): on until the User turns it off; nothing is sent without a verified email. */
    emailNotifications: boolean("email_notifications").notNull().default(true),
    matchHistoryVisibility: matchHistoryVisibilities("match_history_visibility")
      .notNull()
      .default("everyone"),
    addedByUserId: uuid("added_by_user_id").references(
      (): AnyPgColumn => user.id,
      { onDelete: "set null" },
    ),
    /**
     * Set when an Organizer or Group approver added the person by phone. With
     * a null `clerk_id` it marks an Unclaimed player; legacy rows without a
     * clerkId leave it null so they are never read as Unclaimed (ADR-0042).
     */
    addedAt: timestamp("added_at"),
    claimedAt: timestamp("claimed_at"),
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
    unclaimedHasPhone: check(
      "user_unclaimed_has_phone",
      sql`${table.addedAt} is null or ${table.clerkId} is not null or ${table.phoneNumber} is not null`,
    ),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
}));
