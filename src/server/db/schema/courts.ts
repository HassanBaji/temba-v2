import {
  decimal,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const courts = pgTable("courts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  city: varchar("city", { length: 255 }),
  country: varchar("country", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 255 }),
  website: varchar("website", { length: 255 }),
  logoImageUrl: varchar("logo_image_url", { length: 255 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
