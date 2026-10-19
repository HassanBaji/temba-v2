# Booking is a Venue ledger, separate from Game

**Status:** accepted.

## Decision

A Booking reserves one Court for one interval and belongs to the Venue's ledger. A Game is an event people play; a Booking is the Court they play it on. The two are separate tables. A Game may attach to at most one Booking through `bookings.game_id` (unique, on delete set null), and the cascade runs from Booking to Game only: cancelling a Booking cancels its live Game, cancelling the Game keeps the Booking.

A Booking is held by a User (a Customer) or, later, by a Guest recorded by name and phone. Exactly one of the two holds it, enforced by a check constraint. A Booking snapshots its price and Cancellation policy when it is made (ADR-0027), so editing rules afterwards never changes it.

Slots are derived and never stored. `@repo/domain/booking-slots` computes them from Opening hours, Closures, Pricing rules and occupying Bookings, and the same function serves the availability door and the create check.

## Considered options

1. Reservation fields on Game (Court, start, end, price). Rejected: a Guest Booking, a Booking made by the Venue and a Booking nobody has made a Game for have no Game to hold the fields, and a Game moved to another Venue would silently leave its Court unreserved.
2. A Slot table with one row per Court and start. Rejected: the grid, durations and rules change, so rows would need regenerating, and there would be a second source of truth beside the rules.

## Consequences

A Court with a Booking cannot be deleted: `bookings.court_id` restricts, and `venues.deleteCourt` refuses first with a message. Reports and the Customer list read Bookings alone and never join Games.
