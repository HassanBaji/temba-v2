import { resolve } from "node:path";
import { config } from "dotenv";
import { type Config } from "drizzle-kit";

config({ path: resolve(process.cwd(), ".env") });

const databaseUrl = process.env.DATABASE_URL;

export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
  tablesFilter: ["temba_*"],
  schemaFilter: ["public"],
} satisfies Config;
