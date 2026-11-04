import baseConfig from "@repo/eslint-config/base";

export default [
  { ignores: ["**/*.test.ts"] },
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: ["~/*", "@repo/*", "react", "react/*", "next/*"],
        },
      ],
    },
  },
];
