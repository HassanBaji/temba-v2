import {
  pgTable,
  text,
  timestamp,
  boolean,
  uuid,
  varchar,
  integer,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { account } from "./account";
import { session } from "./session";

export const user = pgTable(
  "user",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkId: text("clerk_id"),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
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
    createdAt: timestamp("created_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => ({
    clerkIdIdx: uniqueIndex("user_clerk_id_idx").on(table.clerkId),
  }),
);

export const userRelations = relations(user, ({ many }) => ({
  account: many(account),
  session: many(session),
}));
