# No double booking is enforced in the create transaction

**Status:** accepted.

## Decision

For one Court, no two occupying Bookings overlap. A Booking occupies its Court while it is `confirmed`, or `pending_payment` with `hold_expires_at` in the future. `cancelled`, `no_show` and `expired` never block, and neither does a `pending_payment` row whose hold has lapsed, so a hold that is cleaned up a few seconds late never blocks a Slot. `isOccupyingBooking` in `@repo/domain/booking-slots` and `occupyingBookings` in `packages/api/src/bookings/occupying.ts` state the same rule in code and in SQL.

`reserveBooking` runs inside the caller's transaction:

1. `select pg_advisory_xact_lock(hashtext(court_id))`, held until commit, so a second reservation for the same Court waits.
2. An overlap query over occupying Bookings on that Court (`starts_at < new end and ends_at > new start`). A hit is `CONFLICT` "That slot was just taken".
3. The insert.

The door validates the whole request first with the pure `evaluateSlot` against freshly read data, so the Customer gets a specific refusal (off the grid, outside Opening hours, in a Closure, no price, too soon, too far, taken). The lock and overlap query are the guard that holds under concurrency; the earlier check is for the message.

## No exclusion constraint

The spec allowed `EXCLUDE USING gist (court_id WITH =, tsrange(starts_at, ends_at) WITH &&) WHERE (status IN ('confirmed', 'pending_payment'))` as defence in depth when the PGlite harness can load `btree_gist`. It was tried: PGlite loads `btree_gist` only when the extension is passed to the `PGlite` constructor (`@electric-sql/pglite/contrib/btree_gist`). The shared harness `createPgliteDb` builds a plain PGlite and runs the Drizzle migrations, and `create extension btree_gist` fails there with "extension is not available". Migration 0055 therefore has no extension and no constraint.

A constraint would also disagree with the rule above: it cannot see `hold_expires_at` against the clock, so a lapsed hold would keep blocking until the expire job ran.

## Considered options

1. Make the harness load `btree_gist` and add the constraint. Rejected for this change: it widens the shared test harness and the constraint still cannot express lapsed holds.
2. Lock the Venue row instead of the Court. Rejected: it serialises every Booking at a Venue when only same-Court reservations can conflict.
3. Rely on the overlap query alone. Rejected: two transactions can both read no overlap before either inserts.

## Consequences

The advisory lock plus overlap query is the only guard, so every writer of `bookings` that changes a Court or an interval must go through `reserveBooking`. The test for concurrent creates relies on PGlite serialising transactions, so it proves the second caller sees the first caller's row; a separate test asserts the advisory lock is held after a reservation.
