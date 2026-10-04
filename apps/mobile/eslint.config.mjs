import baseConfig from "@repo/eslint-config/base";
import clientBoundary from "@repo/eslint-config/client-boundary";

export default [
  { ignores: ["dist/**", ".expo/**", "*.config.js", "scripts/**"] },
  ...baseConfig,
  ...clientBoundary(["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"]),
];
