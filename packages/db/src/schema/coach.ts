import {
  pgTable,
  uuid,
  timestamp,
  pgEnum,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { user } from "./user";
import { groupSports } from "./group-enums";
import { venues } from "./venues";

export const coachSports = pgEnum("coach_sport", ["padel", "football"]);

export enum CoachSportEnum {
  PADEL = "padel",
  FOOTBALL = "football",
}

export const coach = pgTable("coach", {
  id: uuid("id").primaryKey().defaultRandom(),
  sport: coachSports().default(CoachSportEnum.PADEL),
  name: varchar("name", { length: 255 }),
  mobile: varchar("mobile", { length: 255 }),
  email: varchar("email", { length: 255 }),
  description: varchar("description", { length: 255 }),
  courtId: uuid("court_id")
    .references(() => venues.id, { onDelete: "cascade" })
    .notNull(),
  imageUrl: varchar("image_url", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  addedBy: uuid("added_by")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
