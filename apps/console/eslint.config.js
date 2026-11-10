import clientBoundary from "@repo/eslint-config/client-boundary";
import nextJsConfig from "@repo/eslint-config/next-js";

export default [
  { ignores: ["**/*.test.ts"] },
  ...nextJsConfig,
  ...clientBoundary(),
  {
    // ADR-0052: words on screen come from @repo/i18n, so bare JSX text is
    // refused. Brand names and punctuation are the only literals allowed.
    files: ["src/**/*.tsx"],
    rules: {
      "react/jsx-no-literals": [
        "error",
        {
          noStrings: false,
          ignoreProps: true,
          allowedStrings: ["TEMBA", "Temba", "·", "—", "%", "/", ",", "…"],
        },
      ],
    },
  },
];
