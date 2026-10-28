import clientBoundary from "@repo/eslint-config/client-boundary";
import nextJsConfig from "@repo/eslint-config/next-js";

export default [
  { ignores: ["**/*.test.ts"] },
  ...nextJsConfig,
  ...clientBoundary(),
];
