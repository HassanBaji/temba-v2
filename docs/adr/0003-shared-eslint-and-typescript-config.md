# Shared eslint and TypeScript config Packages

EWA Connect keeps lint and tsconfig inside each App (T3 copies). We still want that *rule set*, but we extract `@repo/eslint-config` and `@repo/typescript-config` so the App and the DB Package share Temba’s compiler and lint rules without pasting them twice. Contents stay T3 (including Drizzle lint on the App); we do not adopt Turborepo starter plugins (turbo, only-warn).

A related, easy-to-reverse fork: Prettier lives as one config at Root (with the existing Tailwind plugin), not as a Package. The App and the DB Package both run `format:*` against that Root config.
