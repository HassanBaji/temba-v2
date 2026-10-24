Status: ready (the user accepted every recommended default in section 11 on 2026-10-24; tickets published to Linear)

# Verified Groups: anyone creates a Group; only Verified Groups host rated and public Games

## 1. Problem

The user's original request, verbatim:

> "I want to allow anyone to create groups, however only groups with permissions would be able to create ranked and public games."

The user's follow-up on who grants the permission, verbatim:

> "operator can allow any group and venue manager can link groups to their community. Each venue should have a community by default when linking a group to it create the community and add the group as part of the community"

Today creation is limited to a few Users by a client-only Clerk flag, `publicMetadata.groupCreator` (spec `.scratch/group-creator-ui-gate/spec.md`, TEM-89/TEM-90). The flag hides Create Community, Create Group (Loose and Club) and Create Game on web and mobile, and the server never checks it. Every Group Game is a Rated Game.

The product wants Groups open to everyone. Opening them without a guard would let any User make a Group, play Games in it, and move Levels and Standings with no oversight. They could also open those Games to anyone with the link.

The guard belongs on the Group. A Group may host Games that rate or that are public only in two cases:
- an Operator has verified it, or
- a Venue manager has linked it into that Venue's own Community, and the Group's creator has accepted.

## 2. Settled decisions

These come from the user via the coordinator. Do not reopen them.

**D1. An Operator can verify any Group.**
- Any Group: Loose or Club, live or in a Soft-archived Community.
- An Operator can also remove the verification.
- Done from the web App, under the Operator area.

**D2. A Venue manager can link a Group to their Venue's Community.**
- The link is made from the Venue console (`apps/console`, ADR-0031).
- A linked Group is permitted to host Rated and public Games.
- Unlinking removes that permission, unless an Operator has also verified the Group.
- Games that already exist keep their `rated` and `isPublic` values in every case.

**D3. A linked Loose Group becomes a Club Group of that Community.** Section 5 specifies the conversion.

**D4. The Group's owner must accept the link.**
- The glossary has no "Group owner" (it is on the Avoid list under Group approver). The owner of a Loose Group is its **Group creator**, so the Group creator decides.
- A Venue manager's request stays pending until the Group creator accepts or declines.

**D5. A Venue's Community is created only when first needed.**
- It is created when the first Group link is accepted.
- Existing Venues are not backfilled.

**D6. The permission is called "Verified Group".**
- Open question Q2 from the first draft is treated as settled. The coordinator marked Q1 and Q2 answered.
- Rename it only if the user objects.

## 3. Glossary

Existing words this spec relies on:
- "Ranked" means **rated**. An **Unrated Game** (`games.rated = false`) never produces rating events, never moves a Level and never feeds a Standing, but still counts in Last 10, All time stats and Win streak. "Ranked" is on the glossary's Avoid list.
- A "public Game" has `games.isPublic = true`, shown in the UI as "Anyone with the link" under "Who can take a seat". It opens the join gate to any authenticated User and lists the Game in public pickup, which the Games hub currently hides (TEM-224).
- **Venue link**: a Community's association with at most one Venue. Today it is set only when an Operator approves a Venue link request. Many Communities may link the same Venue.

New terms for `CONTEXT.md`:

> **Verified Group**:
> A Group that may host Rated Games and public Games: one an Operator verified, or a Club Group of a Venue Community. Every other Group's new Games are Unrated and private. A Game keeps the rated and public values it was created with, whatever later happens to its Group.
> _Avoid_: ranked Group, official Group, premium Group, permitted Group, groupCreator (that is a Clerk key)

> **Venue Community**:
> The one Community a Venue owns. It is created when the first Group link request to that Venue is accepted, and it carries a Venue link to that Venue that cannot be unlinked. Its Club Groups are Verified Groups. A Venue has at most one Venue Community; other Communities may still hold a Venue link to the same Venue.
> _Avoid_: venue club, default Community (in product copy), home Community

> **Group link request**:
> A Venue manager's request that a Loose Group join that Venue's Venue Community. The Group creator accepts or declines it. Accepting turns the Loose Group into a Club Group of the Venue Community. Distinct from a Group join request (a User asking to join a Group), a Venue link request (a Community asking for a Venue) and a Team link request.
> _Avoid_: Group join request, Venue link, invite (when you mean this request), Group transfer

Edits to existing entries:
- **Unrated Game**: drop "Today only a Booking Game … only `bookings.createGame` sets it". It becomes "a Booking Game, or any Game created on a Group that was not a Verified Group at create".
- **Game**: add that a Game on a Group that is not Verified is Unrated and private.
- **Venue link**: add that a Venue Community's Venue link is set when the Venue Community is created, without a Venue link request, and that it cannot be unlinked.
- **Loose Group / Club Group**: add that a Loose Group becomes a Club Group when its Group link request is accepted, and becomes Loose again when it is unlinked from its Venue Community.

ADRs:
- `docs/adr/0035-rated-and-public-games-need-a-verified-group.md`. It records:
  - Verification is a Group fact, held in one of two ways: Operator-verified (stored) or Venue Community membership (derived).
  - `rated` and `isPublic` are snapshots taken at Game create.
  - The server enforces the rule. That is unlike the `groupCreator` UI gate.
  - Rejected options: a per-User flag, and inferring rated on read.
- `docs/adr/0036-venue-community-and-group-link-requests.md`. It records:
  - A Venue has at most one Venue Community, created lazily.
  - The Venue manager who sent the first accepted request becomes its creator and Owner (Q14).
  - A Loose Group may join it, and later leave it.
  - It partly supersedes ADR-0004 ("the parent is chosen at create time and is immutable"). The parent can now change exactly through Group link request accept and Venue Community unlink, and through nothing else.

## 4. Current state (discovery)

### Group creation
- **Server:** any authenticated User can create a Group.
  - The doors are `groups.createLoosePublic`, `createLoosePrivate`, `createClubPublic` and `createClubPrivate`: `packages/api/src/routers/groups/createLoosePublic.ts:34-52`, `createClubPublic.ts:36-56`.
  - Inserts go through `packages/api/src/groups/helpers/create-loose-group.ts:14` and `create-club-group.ts:19`.
  - Club Group create requires Owner or Admin.
- **Clients:** creation is hidden unless `groupCreator === true`.
  - Web: `apps/web/src/components/create-access-gate.tsx:13-60`, `apps/web/src/app/dashboard/groups/page.tsx:234,314-362`, `groups/new/layout.tsx`.
  - Club Group create needs the flag AND `canCreateClubGroup`: `packages/domain/src/community.ts:318-323`.
  - Mobile: `apps/mobile/src/groups/groups-screen.tsx:57`, `group-create-screen.tsx:143-165`, `communities/community-home-screen.tsx:58,295`.
- The same flag also gates the Communities nav (`apps/web/src/components/layout/app-nav-visibility.ts:11-17`), Create Community and Create Game.

### Game creation and the rated and public values
- Schema `packages/db/src/schema/games.ts:45-46`: `isPublic default false`, `rated default true`.
- `games.create` (Friendly game and Americano), `packages/api/src/routers/games/create.ts`:
  - It accepts `isPublic` (`:43`) but ignores it and always stores false (`:205`; `packages/api/src/games/create-friendly.ts:98`).
  - It never sets `rated: false` (`create-friendly.ts:107`; the Americano insert at `create.ts:197-215` relies on the column default).
- `games.createTournament` is the only Group path that honours `isPublic` (`createTournament.ts:139,266`). It is always rated.
- `bookings.createGame` is the only writer of `rated: false` (`routers/bookings/createGame.ts:113`; ADR-0029).
- Organizer gate: `mayCreateGameOnGroup` / `assertMayCreateGameOnGroup`, `packages/api/src/games/access.ts:102-143`.
- **Club Group Games are locked to the Community's linked Venue**: `packages/api/src/games/assert-game-create-venue-and-court.ts:28-35`.
- No procedure changes `rated` or `isPublic` after create, so there are no edit paths to gate.
- `games.listCreateGroups` returns `{ id, name, communityName }` (`listCreateGroups.ts:12-16`).
- Client builders:
  - `packages/domain/src/create-game-submit.ts:141` always sends `isPublic: false` for a Friendly game.
  - `create-game-submit.ts:237` sends `draft.isPublic` for a tournament.
- The public choice appears only on the tournament form: web `apps/web/src/app/dashboard/games/new/friendly-tournament-steps.tsx:838-860`, mobile `apps/mobile/src/create-game/details-step.tsx:232-245`.
- Create Game gates that read `groupCreator`:
  - Web: `games/new/layout.tsx`, `games/page.tsx:452,484`, `components/home/home-next-game.tsx:106-111`, `groups/[id]/page.tsx:466-487`.
  - Shared helpers: `packages/domain/src/group-home-cta.ts:43-48` and `home-no-games.ts:5-20`.
  - Mobile: `create-game/create-screen.tsx:198`, `games/games-screen.tsx:32`, `home/home-screen.tsx:43-56`.

### Venue, Community and Group today
- **Group to Community.** `groups.community_id` is nullable (`packages/db/src/schema/groups.ts:38-40`): null means a Loose Group, set means a Club Group. ADR-0004 says the parent is chosen at create and is immutable. **No code moves a Group between Loose and Club.**
- **Community to Venue.** `communities.venue_id` is nullable (`packages/db/src/schema/communities.ts:28-30`).
  - It is set only by an Operator approving a Venue link request (`packages/api/src/routers/venues/approveLinkRequest.ts`; schema `venue-link-requests.ts`).
  - Owner or Admin may clear it (`routers/communities/unlinkVenue.ts`).
  - Many Communities may link one Venue.
  - **A Venue has no Community of its own and no pointer to a Community.**
- **Venue manager.** A row in `venue_managers` (ADR-0025, `packages/db/src/schema/venue-managers.ts`).
  - `requireVenueManager` passes Operators and managers of that Venue (`packages/api/src/venues/helpers/require-venue-manager.ts:11-37`).
  - Venue managers hold no Community role. ADR-0025 rejected tying the manager role to the linked Community.
- **Community create.**
  - `createCommunity` (`routers/communities/create.ts`) inserts the Community with a non-null `createdBy`.
  - It admits the creator as Owner through the shared Community membership `admit` module (`packages/api/src/community-membership/admit.ts`).
  - It writes the Community sports.
  - Invariant: a Community always has at least one Owner.
- **Club Group rules that a Loose Group does not have:**
  - Joining requires Community membership (`routers/groups/acceptLookupInvite.ts:47-51`, reason `must_be_member`).
  - Non-Members can only send a Group join request, even with Require approval off; approving it also admits them to the Community.
  - The Group creator may Lookup-invite existing Members only and cannot mint Invite links.
  - Owner and Admin become Organizers and Group approvers.
  - New Games are locked to the Community's linked Venue.
  - Community Soft-archive freezes the Group.
  - The Group's sport must be one of the Community sports.
- **Existing consent patterns:**
  - Team link request: a Team member asks, Community Owner or Admin decides.
  - Venue link request: Owner or Admin asks, an Operator decides.
  - Both use `pending`/`approved`/`rejected` with a partial unique index on pending (`team-link-requests.ts`, `venue-link-requests.ts`), and doors under the target's router.
  - Lookup invites (the invitee accepts) appear on the web Invites page (`apps/web/src/app/dashboard/invites/page.tsx:27-66`) and the mobile Invites screen (`apps/mobile/src/invites/invites-screen.tsx:34-79`).
  - In-app Notifications exist (ADR-0022, `packages/db/src/schema/notifications.ts`).
- **Console.** Sections are listed in `apps/console/src/lib/console-paths.ts` (`CONSOLE_SEGMENTS`, `CONSOLE_NAV`). There is no Groups or Community section.
- **Operator.** Clerk `operator`, enforced by `operatorProcedure` (`packages/api/src/trpc.ts:155`). The web Operator area is `/dashboard/venues`. An Operator cannot open a Club Group outside their Communities (`groups.byId` requires Community membership, `byId.ts:266-274`).
- **Migrations.** A generated migration may end with a data backfill (see `packages/db/drizzle/0034_*.sql`). The newest migration is `0058`.

## 5. Behaviour

### 5.1 Group and Game creation
1. Any authenticated User may create a Loose Group, Public or Private, on web and mobile.
2. A Community Owner or Admin may create a Club Group wherever `canCreateClubGroup` is true. The `groupCreator` AND is removed (Q6).
3. Create Community and the Communities nav stay behind `groupCreator`.
4. A new Group is not Verified. One exception: a creator with `groupCreator === true` gets an Operator-style verification at create, which keeps today's staff flow (Q3).
5. Any Organizer of a Group may create Games. The `groupCreator` gate on Create Game is removed (Q5).
6. On a Verified Group, Create Game works as today. Every format is rated, and a tournament may be public.
7. On a Group that is not Verified:
   - Every new Game is created with `rated = false`.
   - `games.createTournament` with `isPublic: true` is refused: `FORBIDDEN`, "Only a Verified Group can open a Game to anyone with the link".
   - `games.create` keeps storing `isPublic = false`, as it does today.
8. `rated` and `isPublic` are fixed at create. No later change to the Group's verification touches an existing Game (D2).
9. Booking Games are unchanged.

### 5.2 What makes a Group Verified
A Group is Verified if either holds:
- **(a)** `groups.verified_at` is set. This is an Operator verification (D1), or the creator-flag case in rule 4.
- **(b)** The Group's Community is a Venue Community (D2).

Case (b) is derived, not stored. Unlinking therefore removes it with no extra write. Case (a) survives an unlink.

### 5.3 Operator verification (D1)
10. On a new Operator Groups page in the web App, an Operator searches all Groups and verifies or unverifies any of them. Each row shows "Verified by Venue Community: {Venue}" read-only for case (b).
11. `verified_at` and `verified_by` record the grant. Unverifying clears both. There is no history table (Q8).

### 5.4 Group link request (D2, D4)
12. In the Venue console, a new **Groups** section lets a Venue manager (or an Operator, who manages every Venue):
    - see the Venue Community, if there is one, and its Club Groups;
    - see pending Group link requests;
    - search for a Group;
    - send a Group link request;
    - cancel a pending request;
    - unlink a Club Group from the Venue Community.
13. **Only Loose Groups can be targeted.** A Club Group already belongs to a Community and is not offered (Q16).
14. Search covers live Loose Group Public by name, the same Groups the Public Groups list exposes. Loose Group Private is not searchable in v1 (Q17).
15. One pending request per (Group, Venue). Several Venues may each have a request pending to the same Group.
16. Sending is refused when:
    - the Venue is Soft-archived;
    - the Group is not Loose;
    - a request from this Venue is already pending.
17. The Group creator sees pending requests in two places on both web and mobile:
    - **Invites:** a "Venue requests" section on the web Invites page and the mobile Invites screen, beside today's Lookup invites. This reuses the Lookup invite "invitee accepts" pattern and surface.
    - **Group home:** a banner for the Group creator with Accept and Decline.
    - An in-app Notification is not in v1 (Q19).
18. **Decline**:
    - The request becomes `rejected` (`decided_by` = Group creator).
    - The Venue manager sees it as declined in the console.
    - The Venue may send a new request later.
19. **Accept** runs in one transaction. It first locks the Venue row, then re-checks:
    - the request is still pending;
    - the Group is still Loose;
    - the caller is the Group creator;
    - the Venue is not Soft-archived.

    It then does the following:
    1. **Find or create the Venue Community (D5).** If the Venue has none, create one:
       - `name` = Venue name
       - `type` = Private (Q15)
       - `createdBy` = the request's `requested_by`
       - `venue_id` = the Venue
       - `is_venue_community` = true
       - sports = the Group's sport

       Admit `requested_by` as **Owner** through the shared `admit` module (Q14). The Venue link is set directly, with no Venue link request.
    2. **Add the Group's sport** to the Community sports if it is missing.
    3. **Admit every current Group member** as a Community **Member** through `admit`. This includes the Group creator. Users who are already Members keep their role.
    4. **Set `groups.community_id`** to the Venue Community. Group `type`, Public or Private, is kept, so a Loose Group Public becomes a Club Group Public.
    5. **Revoke pending Group Lookup invites sent to Users who are not Community Members.** Under Club Group rules their accept would fail with `must_be_member` (Q20).
    6. **Mark the request `approved`**, and mark any other pending requests for this Group `cancelled`.
20. After accept, the Group follows existing Club Group rules. There are no special cases (Q18):
    - Community Owner and Admin become Organizers and Group approvers alongside the Group creator. The Group creator keeps Organizer and approver powers while a Community Member.
    - The Group creator may Lookup-invite existing Members only, and can no longer mint Invite links. Invite links minted earlier keep working until they expire (6 hours). Accepting one follows the Club Group path and admits the User as a Community Member.
    - The Group stays on the Public Groups list as a Club Group Public of a Private Community. Community Members may Join, or Request if Require approval is on. Non-Members can only send a Group join request, which also admits them to the Community. **This means outsiders lose the direct Join they had on a Loose Group Public.**
    - Pending Group join requests stay pending and are now decided under Club Group rules.
    - **New Games are locked to the Venue,** because the Venue Community has that Venue link (Q21). Existing Games keep their Venue.
    - Standing, Games, history and the Group id are unchanged.
    - The Group is now Verified (case b).
21. On the Venue Community:
    - `communities.unlinkVenue` and `communities.requestVenueLink` are refused.
    - Owner or Admin may still Soft-archive it under existing rules. While it is archived, Club Group Game create is refused, as for any archived Community (Q22).

### 5.5 Unlink
22. A Club Group of a Venue Community can be unlinked by either side (Q23):
    - a Venue manager of that Venue, from the console;
    - the Group creator, from Group home on web and mobile.
23. Unlink, in one transaction:
    - Set `groups.community_id = null`. The Group is Loose again, with the same type, members and Group creator.
    - Community memberships made by the link are kept. Members may leave the Venue Community themselves.
    - The Group loses case (b) Verification. It stays Verified only if `verified_at` is set.
    - Existing Games keep their `rated`, `isPublic` and Venue.
    - Pending Group join requests stay pending and are decided under Loose Group rules.
    - Open Club Group Lookup invites sent by Owner or Admin stay valid and admit to the Loose Group only.
24. Unlinking a Group created in that Venue Community through Create Club Group is refused. Only Groups that arrived through a Group link request can be unlinked: the Group must have an `approved` Group link request for that Venue.

### 5.6 Visible cues
25. On the Create Game form, with a Group that is not Verified:
    - the tournament "Anyone with the link" choice is hidden;
    - one line explains that Games in this Group are Unrated.
26. Optional (Q9): an "Unrated" mark on Game details and cards before play.
27. Optional (Q10): Group home Standing empty copy for a Group that is not Verified.

## 6. Data model change (`@repo/db`)

```text
groups.verified_at        timestamp null          -- Operator verification (case a)
groups.verified_by        uuid null -> user(id) on delete set null

communities.is_venue_community  boolean not null default false
  unique index communities_venue_community_unique on (venue_id) where is_venue_community
  check: not is_venue_community or venue_id is not null

group_link_request_status enum: pending | approved | rejected | cancelled
group_link_requests
  id uuid pk
  group_id uuid not null -> groups(id) on delete cascade
  venue_id uuid not null -> venues(id) on delete restrict
  requested_by uuid not null -> user(id) on delete restrict
  status group_link_request_status not null default 'pending'
  decided_by uuid null -> user(id) on delete set null
  created_at, updated_at
  unique index group_link_requests_pending_unique on (group_id, venue_id) where status = 'pending'
```

Design notes:
- The Venue Community is marked on the Community, not pointed to from the Venue. This avoids a circular foreign key, `communities.venue_id` already exists, and the partial unique index enforces "at most one per Venue".
- The request table mirrors `team_link_requests` and `venue_link_requests`. It adds `cancelled` so a manager can withdraw a request and so accepting one request closes the others.
- No column records "joined via link". Rule 24 reads the approved request instead.

Migrations: new generated migrations only. Never edit 0000–0058.
- **M1 (T1):** the `groups.verified_*` columns, plus a backfill appended to the SQL: `UPDATE "groups" SET "verified_at" = "created_at" WHERE "verified_at" IS NULL;`. Every existing Group keeps its present behaviour (Q7).
- **M2 (T5):** `communities.is_venue_community`, its index and its check, and the `group_link_requests` enum and table. **No Venue backfill (D5).** No existing Community is made a Venue Community (Q24).

## 7. Enforcement points (server is the source of truth)

These follow the one-endpoint-per-file rule. Code is extracted only when two or more doors share a rule:
- `groupIsVerified(database, group)` in `packages/api/src/groups/` returns `verified_at != null || community.is_venue_community`. Used by `games.create`, `games.createTournament`, `games.listCreateGroups`, `groups.byId` and `groups.listForOperator`.
- `unlinkGroupFromVenueCommunity` in `packages/api/src/venue-community/` is the shared unlink. Used by `venues.unlinkGroup` and `groups.unlinkFromVenue`.

The accept conversion has a single caller, so it stays in `acceptLinkRequest.ts`. Community admission goes through the existing shared `admit` module.

| Door | Router file | Change |
| --- | --- | --- |
| `groups.createLoosePublic` / `createLoosePrivate` / `createClubPublic` / `createClubPrivate` | `routers/groups/` | Read `ctx.getPublicMetadata()`. When `groupCreator === true`, pass `verifiedBy` to the shared create helpers. Inputs unchanged. |
| `games.create` | `routers/games/create.ts` | Set `rated = groupIsVerified` on the Friendly game and Americano inserts. `isPublic` stays `false`. |
| `games.createTournament` | `routers/games/createTournament.ts` | Same `rated` rule. Refuse `isPublic: true` on a Group that is not Verified (`FORBIDDEN`). |
| `games.listCreateGroups` | existing | Output gains `verified: boolean`. Additive. |
| `groups.byId` | existing | Output gains `verified: boolean`, `venueCommunity: { venueId, venueName } \| null`, `pendingLinkRequestCount` (Group creator only) and `canUnlinkFromVenue`. Additive. |
| `groups.setVerified` (new) | `routers/groups/setVerified.ts` | `operatorProcedure`. Sets or clears `verified_at` and `verified_by`. Idempotent. |
| `groups.listForOperator` (new) | `routers/groups/listForOperator.ts` | `operatorProcedure`. Paged name search over all Groups. Each row carries the verification source. |
| `venues.listCommunityGroups` (new) | `routers/venues/` | `requireVenueManager`. Returns the Venue Community (or null), its Club Groups, and the Venue's pending and recently decided requests. |
| `venues.searchLinkableGroups` (new) | `routers/venues/` | `requireVenueManager`. Searches live Loose Group Public by name. Excludes Groups with a pending request from this Venue. |
| `venues.sendGroupLinkRequest` (new) | `routers/venues/` | `requireVenueManager`. Applies rule 16. |
| `venues.cancelGroupLinkRequest` (new) | `routers/venues/` | `requireVenueManager` on the request's Venue. pending → cancelled. |
| `venues.unlinkGroup` (new) | `routers/venues/` | `requireVenueManager`, then the shared unlink (rules 23–24). |
| `groups.pendingLinkRequests` (new) | `routers/groups/` | Pending requests on Groups the caller created: Venue name, logo and Group name. |
| `groups.acceptLinkRequest` (new) | `routers/groups/` | Group creator only. Rule 19, in one transaction with `SELECT … FOR UPDATE` on the Venue row. |
| `groups.declineLinkRequest` (new) | `routers/groups/` | Group creator only. pending → rejected. |
| `groups.unlinkFromVenue` (new) | `routers/groups/` | Group creator only, then the shared unlink. |
| `communities.unlinkVenue`, `communities.requestVenueLink` | existing | Refuse on a Venue Community (`BAD_REQUEST`). |
| `bookings.createGame` and Game update doors | | Unchanged. |

Further rules:
- Clerk metadata is read only from the caller (`ctx.getPublicMetadata`), so `@repo/api` stays host-neutral.
- All API changes are additive: new output fields and new procedures. Existing procedure paths are not renamed.
- The `require-operator.ts` message is Venue-specific ("Only Operators can manage Venues"). Make it neutral when the new Operator doors reuse it.

## 8. Client changes

### `@repo/domain`
- `groupHomeCanShowCreateGame` and `groupHomeCtaFamily` (`group-home-cta.ts:43-105`) depend on `canCreateGame` only. The `all_communities` overflow item stays behind `hasCreateAccess`.
- `communityHomeActions` (`community.ts:318`) returns `canCreateClubGroup = data.canCreateClubGroup`.
- `homeNoGamesCreateAction` (`home-no-games.ts:5`) drops the `hasCreateAccess` gate.
- `create-game-submit.ts:237` sends `isPublic: draft.isPublic && verified`.
- Group link request copy and row meta, if both the web and mobile Invites surfaces need them. Reuse `@repo/domain/request-meta` where it fits.
- Update the tests beside each of these.

### Web App (`apps/web`)
- Remove `CreateAccessGate` from `groups/new` and `games/new`. Keep it on `communities/new`, with the copy "New Communities are set up by Temba staff."
- Show Create Group and Create Game on every surface listed in section 4 without `hasCreateAccess`, including Create Club Group on Community home.
- Create Game form: hide the tournament public chip and show the Unrated line for a Group that is not Verified.
- Operator Groups page with search and a Verify / Remove verification action. It gets an Operator-only sidebar item, the same way Venues does.
- Invites page: a "Venue requests" section with Accept and Decline, from `groups.pendingLinkRequests`, `acceptLinkRequest` and `declineLinkRequest`.
- Group home:
  - a banner for the Group creator when a request is pending;
  - a "Part of {Venue}" line when `venueCommunity` is set;
  - a "Leave {Venue}'s Community" overflow item when `canUnlinkFromVenue` is true, with a confirm dialog that says new Games will be Unrated.
- `useCreateAccess` keeps its name. Renaming it is a non-goal.

### Venue console (`apps/console`)
- Add a `groups` segment to `CONSOLE_SEGMENTS` and `CONSOLE_NAV` (`apps/console/src/lib/console-paths.ts`).
- New page `apps/console/src/app/[venueId]/groups/page.tsx`:
  - Venue Community summary, or "No Community yet. It is created when the first Group accepts."
  - Club Groups list with Unlink.
  - Pending and declined requests with Cancel.
  - A "Link a Group" search sheet that calls `venues.searchLinkableGroups` and `sendGroupLinkRequest`.
- Use the console's existing primitives and empty-state conventions (ADR-0031).

### Mobile App (`apps/mobile`)
- Remove the `groupCreator` gates on Loose Group create, Create Game and Create Club Group (files listed in section 4).
- Create Game details step: hide the public chip and show the Unrated line for a Group that is not Verified. Reset `isPublic` when the Group changes.
- Invites screen (`apps/mobile/src/invites/invites-screen.tsx`): a "Venue requests" section with Accept and Decline.
- Group home: the request banner for the Group creator, the "Part of {Venue}" line, and a Leave action for the Group creator.
- Mobile has no Operator or Venue manager surface.

## 9. Tests

Procedure tests go through the exported plain functions against PGlite. Pure logic gets Vitest beside it.

Verification and Game create:
- `games.create` on a Group that is not Verified: rated false, `isPublic` false.
- `games.create` on a Verified Group: rated true.
- An Unrated Group Game writes no rating events and no Standing.
- `games.createTournament` on a Group that is not Verified refuses `isPublic: true` and creates rated false.
- `games.createTournament` on a Verified Group allows public.
- Snapshot: unverifying, unlinking or verifying a Group leaves existing Games' `rated` and `isPublic` unchanged.
- `groupIsVerified` covers Operator-verified, Venue Community Club Group, a Club Group of an ordinary Venue-linked Community (not Verified), and Loose.

Group create:
- `groups.create*` with `groupCreator` metadata sets `verified_*`.
- Without it, `verified_*` stays null.

Operator doors:
- `groups.setVerified` and `groups.listForOperator` refuse callers who are not Operators.
- `setVerified` is idempotent.
- `listForOperator` finds Groups in archived Communities.

Group link request, send and cancel:
- Refused for a caller who is not a manager.
- Refused for a Club Group target.
- Refused on a Soft-archived Venue.
- A duplicate pending request is refused.
- Cancel works only while pending.

Accept, first link:
- Creates the Venue Community: Private, linked to the Venue, `is_venue_community`, Owner = requester, sport = the Group's.
- Admits every Group member as a Member.
- Sets `community_id` and keeps the type.
- Revokes Lookup invites to non-Members.
- Closes the other pending requests.

Accept, second Group:
- Reuses the Venue Community and adds a missing sport.
- An existing Admin keeps the Admin role.

Accept, refusals:
- Refused for a caller who is not the Group creator.
- Refused for a Group that is already Club, and when the Venue is archived.
- Concurrent first accepts on two Groups of one Venue create exactly one Venue Community. Test the unique index and the row lock.

After accept:
- A non-Member's Join on the Group becomes a request.
- Game create is locked to the Venue.
- The Group is Verified.

Decline:
- Sets the request to rejected.
- A new request can then be sent.

Unlink (by manager and by Group creator):
- The Group becomes Loose and memberships are kept.
- Verification is lost unless `verified_at` is set.
- Refused for a Club Group created directly in the Venue Community.
- Refused for callers on neither side.

Venue Community refusals: `communities.unlinkVenue` and `requestVenueLink` are refused on a Venue Community.

Migrations:
- M1 backfill marks pre-existing Groups as verified.
- M2 creates no Communities.

`@repo/domain` unit tests: the gate removals and the submit builder.

Seed (`packages/api/scripts/seed.ts`) adds:
- a Group that is not Verified, with an Unrated Game;
- a Venue whose manager has a pending Group link request to a seeded Loose Group Public;
- a Venue with a Venue Community holding one linked Group.

Manual pass on web, mobile and console:
- non-flagged User creates a Group and an Unrated Game;
- manager sends a request;
- creator accepts on web and on mobile;
- the Group becomes Club and Verified;
- the creator unlinks;
- an Operator verifies a Group from the web.

## 10. Tickets (implementation order, vertical slices)

Every ticket must pass `pnpm exec turbo run typecheck lint test`.

**T1. Rated and public Games need a Verified Group (server and docs)** (TEM-372)
- Migration M1 with its backfill.
- `groupIsVerified`, Operator case only for now.
- The `rated` and `isPublic` rules in `games.create` and `games.createTournament`.
- Auto-verify on Group create for `groupCreator` callers.
- `verified` on `listCreateGroups` and `groups.byId`.
- `CONTEXT.md`: Verified Group, Unrated Game, Game. ADR-0035.
- No UI change, and behaviour is unchanged because of the backfill.
- Blocked by: nothing.

**T2. Create Game adapts to the Group's verification (web and mobile)** (TEM-373)
- Domain submit builder.
- Hide the tournament public chip and show the Unrated line on both clients.
- Mobile draft reset on Group change.
- Blocked by: T1.

**T3. Operators verify and unverify Groups (web)** (TEM-374)
- `groups.setVerified`, `groups.listForOperator`, the Operator Groups page and its sidebar item.
- Blocked by: T1.

**T4. Anyone can create a Group, and Organizers can create Games (web and mobile)** (TEM-378)
- Remove the `groupCreator` gates (section 8).
- Narrow `CreateAccessGate` to Communities.
- Domain changes and tests.
- Mark `.scratch/group-creator-ui-gate/spec.md` as partly superseded.
- Blocked by: T1 and T2. Ship T3 before or with T4.

**T5. A Venue manager links a Loose Group into the Venue Community, and the Group creator accepts on web (server, console, web)** (TEM-375)
- Migration M2.
- The four `venues.*` doors for list, search, send and cancel.
- `groups.pendingLinkRequests`, `acceptLinkRequest` and `declineLinkRequest`.
- Extend `groupIsVerified` with case (b).
- Refuse `unlinkVenue` and `requestVenueLink` on a Venue Community.
- `groups.byId` gains `venueCommunity` and `pendingLinkRequestCount`.
- Console Groups section without Unlink.
- Web Invites "Venue requests", the Group home banner and the "Part of {Venue}" line.
- `CONTEXT.md`: Venue Community, Group link request, Venue link, Loose Group and Club Group edits. ADR-0036.
- Seed rows and tests.
- Blocked by: T1.

**T6. The Group creator accepts or declines a Group link request on mobile** (TEM-379)
- Mobile Invites "Venue requests", Group home banner and "Part of {Venue}".
- Blocked by: T5.

**T7. Unlink a Group from its Venue Community (server, console, web, mobile)** (TEM-380)
- The shared unlink.
- `venues.unlinkGroup` and `groups.unlinkFromVenue`.
- `canUnlinkFromVenue` on `groups.byId`.
- Console Unlink action.
- The Group home Leave action on web and mobile, with a confirm that says new Games will be Unrated.
- Blocked by: T5. T6 is not required, but the mobile half of T7 lands more easily after it.

**T8 (optional, Q9). Mark Unrated Games before play (web and mobile).** (TEM-376) Blocked by: T1.

**T9 (optional, Q10). Group home Standing copy for a Group that is not Verified.** (TEM-377) Blocked by: T1. Could fold into T2.

Suggested sequence: T1 → T2 → T3 → T4 → T5 → T6 → T7, with T8 and T9 any time after T1. T5–T7 do not depend on T2–T4 and can run in parallel with them.

## 11. Open questions (recommended default in bold)

Settled: who grants (D1, D2), the name (D6), link grants permission and unlink removes it (D2), conversion to Club Group (D3), Group creator consent (D4), lazy Venue Community (D5).

On 2026-10-24 the user accepted the recommended default (in bold) for every question below. Treat Q3–Q25 as settled.

Carried over from the first draft:
- **Q3.** Do Groups created by a `groupCreator` User start Verified? **Yes.**
- **Q4.** One permission or two (rated vs public)? **One.**
- **Q5.** Does Create Game open to every Organizer without `groupCreator`? **Yes.**
- **Q6.** Does Create Club Group open to every Owner or Admin without `groupCreator`? **Yes.** Create Community stays staff-only.
- **Q7.** Backfill every existing Group as Verified (with `verified_at = created_at`)? **Yes.** Existing Games keep their values; that part is settled.
- **Q8.** How is a grant audited? **`verified_at` and `verified_by` on the row, no history table.**
- **Q9.** Mark Unrated Games before play (T8)? **Yes.**
- **Q10.** Group home cue for a Group that is not Verified? **Standing empty copy only, no badge.**
- **Q11.** Should non-staff Loose Group Public stay on the Public Groups list? **Yes, unchanged.** Spam risk noted.
- **Q12.** May a Verified Group choose to make a Game Unrated? **Not in v1.**
- **Q13.** Limit on how many Groups one User can create? **No limit in v1.**

New questions from Venue linking:
- **Q14.** Who owns a new Venue Community? Schema and glossary need a `created_by` and at least one Owner.
  - **The Venue manager whose request was accepted first becomes its creator and Owner.**
  - Other managers of the Venue get no Community role, in line with ADR-0025. The console doors authorise by `venue_managers` row, so every manager can still link and unlink.
- **Q15.** Venue Community type?
  - **Private:** no direct request to join the Community; people enter through its Club Groups.
- **Q16.** Can a Club Group of another Community be linked?
  - **No. Only Loose Groups.** Moving between Communities is out of scope.
- **Q17.** Which Groups can a Venue manager find?
  - **Live Loose Group Public by name only.** Private Loose Groups are not exposed in v1.
  - A later option: the Group creator sends a request to a Venue.
- **Q18.** Should a Venue Community's Club Groups follow the standard Club Group rules? Under those rules the Group creator loses Invite link mint and Lookup invites to non-Members, and outsiders must request instead of joining.
  - **Yes, no special cases in v1.**
- **Q19.** Should a Group link request also create an in-app Notification?
  - **Not in v1.** The Invites section and the Group home banner are enough. A Notification needs a new `notification_type` enum value.
- **Q20.** At link, what happens to pending Group Lookup invites sent to Users who are not Community Members?
  - **Revoke them.** Otherwise they fail on accept with "must be a Community Member".
- **Q21.** After linking, new Games on the Group are locked to the Venue (existing Venue-link rule). Is that acceptable?
  - **Yes.** That is the point of a Venue's Community.
  - The alternative needs a special case in `assert-game-create-venue-and-court.ts`.
- **Q22.** Can the Owner Soft-archive a Venue Community?
  - **Yes, under existing rules.** Club Group Game create is refused while it is archived.
- **Q23.** Who may unlink?
  - **Either the Venue manager (console) or the Group creator (web and mobile),** like a Team's Community link, which either member may unlink.
  - Only Groups that arrived by link can be unlinked.
- **Q24.** Should an existing Community that already holds a Venue link become that Venue's Venue Community?
  - **No.** It stays an ordinary Community, and its Club Groups need Operator verification. They are already Verified by the M1 backfill.
- **Q25.** Should the Venue manager or Operator see why a request was declined?
  - **No message field,** matching Group join requests and Team link requests.

## 12. Non-goals
- Server enforcement of `groupCreator`.
- Renaming the Clerk key or `useCreateAccess`.
- Opening Create Community.
- Re-showing public pickup.
- Honouring `isPublic` on `games.create`.
- Any door that changes `rated` or `isPublic` after create.
- Reversing rating events.
- Moving a Club Group between Communities.
- Linking Club Groups.
- Group creator-initiated requests to a Venue.
- Backfilling Venue Communities.
- Adopting existing Communities as Venue Communities.
- Venue managers as Community staff by default.
- Notifications for link requests.
- Mobile Operator or Venue manager surfaces.

## 13. Risks
- **Rating integrity.** T4 must not ship before T1. The M1 backfill keeps every existing Group Verified.
- **Behaviour shift on link.** Outsiders lose direct Join on a Loose Group Public, and the Group creator loses Invite links (Q18). The console and the accept dialog should say so. Copy is to be settled with `ux-copy`.
- **Venue lock (Q21).** A linked Group can no longer play at other Venues. State this in the accept dialog.
- **Concurrency on the first accept.** Two Groups accepting at once for a Venue with no Venue Community. Handled by the Venue row lock and the partial unique index. Tested.
- **ADR-0004 reversal.** Code that assumes `groups.community_id` never changes may cache it. Before T5, audit `communityId` reads in invite tokens, notifications and Standing.
- **Spam Groups (Q11)** and **privacy of search (Q17)** are mitigated by Public-only search and Group creator consent.
- **Mobile not yet released.** All API changes are additive anyway.
