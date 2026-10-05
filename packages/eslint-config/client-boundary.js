import tseslint from "typescript-eslint";

export default function clientBoundary(files = ["src/**/*.{ts,tsx}"]) {
  return tseslint.config({
    files,
    rules: {
      "@typescript-eslint/no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "drizzle-orm",
              message: "Clients never touch the database.",
            },
          ],
          patterns: [
            {
              group: ["@repo/db", "@repo/db/*"],
              message: "Clients never import @repo/db.",
            },
            {
              group: ["@repo/api", "@repo/api/*", "!@repo/api/types"],
              message:
                "Clients import only types from @repo/api/types, never server code.",
            },
            {
              group: ["@repo/api/types"],
              allowTypeImports: true,
              message: "Import @repo/api/types with `import type`.",
            },
          ],
        },
      ],
    },
  });
}
