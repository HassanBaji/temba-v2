# Venue console

The web App where Venue managers run a Venue: schedule, Bookings, Courts and pricing, hours and Closures, Customers, staff, reports and payouts. Operators see every Venue.

- Dev server on :3001 (`pnpm exec turbo run dev --filter console`); the API must run on :4000.
- `/api/*` is rewritten to `API_ORIGIN`, so the browser talks to the API same-origin.
- Signed in with the same Clerk instance as the web App. The API's `AUTHORIZED_PARTIES` must include this App's origin.
- Design: `.scratch/design/booking-flow/Booking flow.dc.html`, screens A1 to A8.
