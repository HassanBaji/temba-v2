# Three Apps: web, API and mobile

**Status:** supersedes [ADR-0002](./0002-one-app-not-two.md).

ADR-0002 kept one App because a second App would have been invented for Turborepo's sake, and named
a second product as the condition for reopening it. A native iOS and Android client is now that
product decision. **The Workspace holds three Apps: the Web App (`apps/web`, Next.js), the API App
(`apps/api`, a Hono host) and the Mobile App (`apps/mobile`, Expo).** The Mobile App and the Web
App call the same tRPC API over HTTP, so the API leaves the Next.js App and is served by its own
host. The plan and its phases are in `.scratch/mobile-and-api-server/spec.md`.

**The Next.js App is renamed from `temba` to `web`.** With three Apps, an App named after the
product is ambiguous. The directory moves with `git mv` so history follows it, and every filter,
script, doc and agent rule points at the new name. The cost is a one-time rename of filters and
the deployment's root directory setting, which must change in the same release as the move.

An App is no longer always Next.js. The API App and the Mobile App arrive in later phases; until
then `apps/web` is the only App and still owns the API.
