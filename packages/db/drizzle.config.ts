import { resolve } from "node:path";
import { config } from "dotenv";
import { type Config } from "drizzle-kit";

config({ path: resolve(import.meta.dirname, ".env") });

export default {
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: ["temba_*"],
} satisfies Config;
