# An Operator links a Group to a Venue directly

**Status:** accepted. Amends [ADR-0055](./0055-community-is-retired-and-a-group-links-to-a-venue.md).

ADR-0055 made a Group link request the only way to make a Venue link: a Venue manager asks, and the
Group creator accepts. Operators curate the Venue catalog from the Operator Venue page in the Web App,
which listed a Venue's Club Groups but could not change them. An Operator onboarding a Venue had to
send requests from the Venue console and then wait for each Group creator to accept.

## Decision

- **An Operator may link a Loose Group to a Venue at once.** `venues.linkGroup` (Operator only) sets
  `groups.venue_id` with no Group link request and no decision from the Group creator. It is offered
  on the Operator Venue page (`/dashboard/venues/[id]`), in the Linked Groups section, behind a
  confirmation.
- **Any live Loose Group, public or private.** `venues.searchGroupsToLink` (Operator only) finds Loose
  Groups by name whatever their visibility. A Venue manager's Group link request still goes only to a
  Loose Group Public, because a Venue manager does not discover private Groups. An Operator already
  sees every Group when verifying them.
- **The same guards as accepting a request.** The Group must not be deleted or already a Club Group,
  and a Soft-archived Venue refuses the link. The Group's pending Group link requests, from any
  Venue, are cancelled, as they are when one is accepted.
- **Nothing else changes.** The Group link request stays the Venue manager's door. Unlinking stays
  with the Group owner (`groups.unlinkFromVenue`) and with Venue managers and Operators
  (`venues.unlinkGroup`), which the Operator Venue page now offers too.

**Considered Options**: having the Operator send a Group link request that is accepted on the
creator's behalf (it leaves a request row nobody decided, and looks like a decision the creator never
made); offering the direct link in the Venue console to Operators only (the console belongs to Venue
managers, and Operators curate Venues in the Web App).

## Consequences

- The tRPC surface gains `venues.linkGroup` and `venues.searchGroupsToLink`. This is additive.
- A Group can become a Club Group without its creator agreeing. The creator, as Group owner, can still
  unlink it from the Group's page.
- No audit row records which Operator linked a Group. `groups.updated_at` is the only trace.
