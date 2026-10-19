# Venue manager is a per-Venue table role

**Status:** accepted. ADR-0024 is reserved for the Booking ledger decision.

A Venue manager is a row in `venue_managers` (`venue_id`, `user_id`, `granted_by_user_id`), unique per Venue and User, granted and revoked by Operators from the Operator Venue page. A User may manage many Venues and a Venue may have many managers. Managers cannot grant other managers. `requireVenueManager` passes for Operator metadata or a row for that Venue and refuses everyone else with `FORBIDDEN`; `listManagedVenueIds` feeds `venues.listManaged`, which decides whether the Web App shows the Manage area. Operator stays Clerk `publicMetadata.operator`, and an Operator is implicitly a manager of every Venue.

## Considered options

1. Clerk `publicMetadata` for managers, like Operator and Level setter. Rejected: the role is per Venue and many-to-many, and it is granted in the product, not in the Clerk dashboard.
2. A Community-style role on the Venue's linked Community. Rejected: a Venue need not have a Community, and Community roles are about membership, not facility management.
3. A role column on the User. Rejected: it cannot say which Venue.

## Consequences

Manager doors use `protectedProcedure` and call `requireVenueManager` after reading the Venue id from the input or from the row they act on; there is no middleware because the Venue id is in the input. Deleting a Venue or a User cascades to their manager rows. The grant is an audit trail only through `granted_by_user_id`; there is no in-app history of revokes.
