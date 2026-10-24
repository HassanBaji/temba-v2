# Sport lives on the Court

**Status:** accepted.

A Court has one sport, and a Venue offers the sports its Courts have. Bookings, Pricing rules and Closures already attach to a Court, so the sport sits beside them and discovery filters Courts, not Venues.

## Decision

- **`courts.sport`** is `group_sport`, not null, default `padel`. It reuses the enum that `ratings`, `teams` and `community_sports` already use; no fourth sport enum. Existing Courts become padel.
- **A Venue manager or an Operator sets it.** `venues.addCourt` takes an optional `sport` (default padel) and `venues.setCourtSport` changes it. Both are authorised by `requireVenueManager`, which Operators pass.
- **Changing a Court's sport never touches Bookings.** A Booking reserves a Court interval whatever the sport.
- **Product copy calls a football Court a pitch.** The entity, tables and code stay Court.

**Considered Options**: a Venue sports allow-list (two sources of truth, and a Venue with both sports would still need per-Court data); a sport on the Booking (it is a property of the Court, not of the reservation).

## Consequences

- Customer discovery and availability filter Courts by sport; a Venue with both sports appears under both.
- A Court switched to another sport keeps its Pricing rules and Closures, so a manager may need to revisit them.
