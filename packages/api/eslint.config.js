import baseConfig from "@repo/eslint-config/base";

const forbiddenImports = [
  "react",
  "react-dom",
  "next",
  "server-only",
  "@clerk/nextjs",
  "@clerk/nextjs/*",
];

export default [
  { ignores: ["**/*.test.ts", "dist/**"] },
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
          ],
        },
      ],
    },
  },
];
