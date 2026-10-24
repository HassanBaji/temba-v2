# A Venue has one Venue Community, and Loose Groups join it by Group link request

**Status:** accepted. Spec: `.scratch/verified-groups/spec.md`. Partly supersedes ADR-0004.

A Venue manager can vouch for a Group by bringing it into the Venue's own Community. That needs a Community the Venue owns, and a way to move an existing Loose Group into it.

## Decision

- **A Venue has at most one Venue Community, created lazily.** `communities.is_venue_community` marks it. A partial unique index on `(venue_id) where is_venue_community` and a check (`not is_venue_community or venue_id is not null`) enforce "at most one per Venue" and "has a Venue". No Venue pointer to a Community, so no circular foreign key. No existing Community is backfilled or adopted.
- **It is created by the first accepted Group link request.** It is Private, named after the Venue, with the Venue link set directly. The Venue manager who sent that request is its `created_by` and Owner. Other managers get no Community role (ADR-0025). `communities.unlinkVenue` and `communities.requestVenueLink` refuse a Venue Community.
- **A Group link request needs the Group creator's consent.** `group_link_requests` (`pending | approved | rejected | cancelled`) has one pending request per (Group, Venue). A Venue manager sends and cancels it; the Group creator accepts or declines. Only a live Loose Group Public can be searched and targeted.
- **Accept is one transaction.** It locks the Venue row with `SELECT … FOR UPDATE`, re-checks that the request is pending, the Group is Loose, the caller is the Group creator and the Venue is live, then finds or creates the Venue Community, adds the Group's sport, admits every Group member as a Community Member through the shared `admit` module, sets `groups.community_id`, revokes pending Lookup invites to Users who are not Community Members, approves the request and cancels the Group's other pending requests.
- **A Club Group of a Venue Community is a Verified Group.** `groupIsVerified` derives it from the Community, so nothing is stored and no later write is needed to remove it.
- **Standard Club Group rules apply afterwards, with no special cases.** Outsiders can only send a request to join, the Group creator can no longer mint Invite links, and new Games are locked to the Venue.

## Supersedes ADR-0004

ADR-0004 said a Group's parent is chosen at create time and is immutable. The parent can now change exactly through accepting a Group link request, and through nothing else. A later change adds the reverse (unlinking a Group from its Venue Community).

Audit of code that reads `groups.community_id`: invite links and Lookup invites store the Group id and read the Community when they are accepted; notifications resolve approvers when sent; Standing, ratings weight and Game Venue lock read the Group's Community on every call. Nothing caches the Community id.

**Considered Options**: pointing from the Venue to its Community (circular foreign key); adopting an existing Venue-linked Community (its Owner never agreed to host a Venue's Groups); a Venue manager moving a Group without consent (the Group creator loses Invite links and direct Join, and the Group is locked to one Venue).

## Consequences

- Linking changes behaviour: outsiders lose direct Join, the Group creator loses Invite links, and the Group can only play at the Venue. The accept dialog says so.
- A Group link request to a Venue whose Venue Community is Soft-archived cannot be accepted.
