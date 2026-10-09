import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const packageRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    testTimeout: 60_000,
    hookTimeout: 60_000,
    include: ["src/**/*.test.ts"],
    env: {
      TEMBA_DRIZZLE_MIGRATIONS: resolve(
        packageRoot,
        "../../packages/db/drizzle",
      ),
      SKIP_ENV_VALIDATION: "true",
    },
  },
});
