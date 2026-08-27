import tseslint from "typescript-eslint";

import nextJsConfig from "@repo/eslint-config/next-js";

export default tseslint.config(...nextJsConfig, {
  files: ["**/*.test.ts"],
  rules: {
    "@typescript-eslint/no-floating-promises": "off",
  },
});
