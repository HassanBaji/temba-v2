import baseConfig from "@repo/eslint-config/base";

const forbiddenImports = [
  "react",
  "react-dom",
  "next",
  "@trpc/*",
  "drizzle-orm",
  "drizzle-orm/*",
  "@repo/db",
  "@repo/db/*",
  "@repo/api",
  "@repo/api/*",
  "@clerk/*",
];

export default [
  { ignores: ["**/*.test.ts"] },
  ...baseConfig,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: forbiddenImports.filter((name) => !name.includes("*")),
          patterns: [
            ...forbiddenImports.filter((name) => name.includes("*")),
            "next/*",
            "react/*",
            "~/*",
            "@repo/*",
          ],
        },
      ],
    },
  },
];
