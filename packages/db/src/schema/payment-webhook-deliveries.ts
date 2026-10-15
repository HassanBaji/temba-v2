import {
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { paymentProvider } from "./booking-enums";

export const paymentWebhookDeliveries = pgTable(
  "payment_webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    provider: paymentProvider("provider").notNull(),
    deliveryKey: varchar("delivery_key", { length: 255 }).notNull(),
    reference: varchar("reference", { length: 255 }).notNull(),
    body: text("body").notNull(),
    headers: jsonb("headers").$type<Record<string, string>>().notNull(),
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    processedAt: timestamp("processed_at"),
    error: varchar("error", { length: 500 }),
  },
  (table) => ({
    deliveryUnique: unique("payment_webhook_deliveries_key_unique").on(
      table.provider,
      table.deliveryKey,
    ),
  }),
);
