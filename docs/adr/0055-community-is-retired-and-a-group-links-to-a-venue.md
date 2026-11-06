# Community is retired, and a Group links to its Venue directly

**Status:** accepted. Supersedes ADR-0004, ADR-0005 and ADR-0036; narrows ADR-0014 and ADR-0035.

Community was the club that sat between Venues and Groups: it held members with Owner, Admin and Member roles, its own join requests, invites and Invite links, a sports allow-list, a Venue link decided by an Operator, Team links, and a Soft-archive that froze every Club Group under it. In practice the one Community that mattered was the Venue Community (ADR-0036), created so a Venue could vouch for a Group. Players never chose a Community; they chose a Group and a Venue. The layer doubled every door (join, invite, approve, archive) and made Club Group rules depend on a membership nobody looked at.

## Decision

- **Community is gone.** The `communities`, `community_members`, `community_sports`, `community_join_requests`, `community_email_invites`, `community_invite_links`, `community_member_invites`, `venue_link_requests` and `team_link_requests` tables, their enums, the `communities` tRPC router, the `community-membership` server module and every Community screen in the Web and Mobile Apps are removed. The glossary drops Community, Community Public and Private, Venue Community, Owner, Admin, Member, Community membership, Community sports, Venue link request, Directory, Club Team and Loose Team.
- **A Group links to at most one Venue.** `groups.venue_id` replaces `groups.community_id`. A **Club Group** is a Group with a Venue link; a **Loose Group** has none. The link is still made only through a Group link request (a Venue manager asks, the Group creator accepts) and ended by either side (`groups.unlinkFromVenue`, `venues.unlinkGroup`). Every Club Group may be unlinked, since every link now comes from an accepted request.
- **A Club Group is a Verified Group** (ADR-0035). `groupIsVerified` reads `verified_at` or `venue_id`; nothing is stored for the derived case. Its new Games are held at the linked Venue, as before.
- **A Club Group has the Loose Group doors.** The Group creator and Appointed Organizers are the Group approvers and Organizers on every Group. Joining a Club Group Public, requesting to join, Lookup invites, Invite links and adding by phone follow the Loose Group rules; there is no membership gate, no auto-admit, no lapsed appointment and no role that outranks the creator. `groups.joinPublic` replaces `joinLoosePublic` and `joinClubPublic`; `createClubPublic` and `createClubPrivate` are removed, because a Group becomes Club only by linking.
- **Teams link to nothing.** `teams.community_id`, Team link requests and the linked/unattached Team states are removed. A Team is a roster of Users and nothing more.
- **Soft-archive is a Venue rule only.** Groups, Teams, Games and invites are never frozen by an archive. A Soft-archived Venue refuses new Group link requests and their acceptance, as it refused them before; its Club Groups stay linked.
- **Migration carries the data over.** Groups of a Venue Community keep their Venue as `groups.venue_id`; Groups of every other Community become Loose; join requests that came from a Community page read as `group_page`. Community rows are dropped.

**Considered Options**: keeping Community as an optional umbrella with no doors (dead weight in every query and screen); mapping Community Owner and Admin onto Venue managers so they keep organizing Club Group Games (gives a venue's staff doors inside players' Groups, which nobody asked for, and would have needed Venue manager checks in every Group door); moving Team links onto Venues (new console surface for a feature with no users).

## Consequences

- The tRPC surface changes before the Mobile App ships: `communities.*`, `groups.createClubPublic`, `groups.createClubPrivate`, `groups.joinClubPublic`, `teams.requestLink`, `teams.unlink`, `venues.listPendingLinkRequests`, `venues.approveLinkRequest` and `venues.rejectLinkRequest` are removed; `groups.joinLoosePublic` becomes `groups.joinPublic` and `venues.listCommunityGroups` becomes `venues.listLinkedGroups`. Once the Mobile App is released, API changes are additive only again.
- A Venue manager links and unlinks Groups from the Venue console but holds no door inside those Groups.
- ADR-0014's Group join requests no longer create any membership beyond the Group's own.
