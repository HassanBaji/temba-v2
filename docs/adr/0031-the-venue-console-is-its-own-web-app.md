# The Venue console is its own web App

**Status:** accepted. Supersedes the "Venue administration stays web only" line in the mobile spec in one respect: it stays on the web, but in `apps/console`, not in `apps/web`.

The Manage area, where a Venue manager runs a Venue (schedule, Bookings, Courts and pricing, Opening hours and Closures, Customers, staff, reports, payouts), moves out of the player web App into the **Venue console**, `apps/console`: a Next.js App on its own origin (port 3001 in development) that signs in through the same Clerk instance, calls the same API over the `/api` rewrite with a bearer token, and renders the "Booking flow" design (screens A1 to A8, `.scratch/design/booking-flow/`). The player web App keeps the Operator Venues area (catalog curation, manager grants) and links to the console instead of hosting Manage pages.

## Why

- The design gives the console its own frame: an ink rail with a Venue switcher and eight sections, desktop-first at 1280 wide, with no player navigation. Fitting that inside the player dashboard shell would mean two shells in one App and a second set of layout rules in `apps/web`.
- Venue staff are a different audience with a different session shape (one Venue at a time, all day) and will get their own release cadence and domain (`console.`), which the Package boundaries already allow: a client App imports only `@repo/domain`, `@repo/validators`, `@repo/design-tokens` and `@repo/api/types`.
- Keeping the API and the Packages unchanged keeps the move a client-side one: the console calls the same manager doors the Manage area called.

## Considered options

1. Keep the Manage area in `apps/web` and restyle it under `/dashboard/manage`. Rejected: two shells and two design languages in one App, and the player sidebar would still frame staff work.
2. A route group with its own layout inside `apps/web` (`/console/**`). Rejected: shares the middleware, env and bundle with the player App for no gain, and still cannot be deployed or released apart.
3. A shared `@repo/ui` Package for the primitives both Apps use. Deferred: the console copies the shadcn primitives it needs from `apps/web`; extracting them is a later move once the two sets stop changing together.

## Consequences

- Package boundaries gain `apps/console` beside `apps/web` and `apps/mobile`; it never imports server code.
- The API lists the console origin as an authorized party (`CONSOLE_ORIGIN`), as it does `WEB_ORIGIN`.
- Design tokens stay in `@repo/design-tokens`; the console adds only radii and rail widths from the design in its own stylesheet.
- The copied primitives under `apps/console/src/components/ui` are a known duplication until a shared UI Package exists.
- Screens the design shows without a door yet (manager-created and cancelled Bookings, Customers, reports, payouts) ship as empty states that name their ticket; the console never invents data.
