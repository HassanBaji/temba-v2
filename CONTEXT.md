# Temba

Temba is a competitive-sports product. This glossary is the language for the Workspace (how the codebase is cut) and for the product domain (what players belong to).

## Language

### Workspace

**Workspace**:
This git repository as a pnpm + Turborepo workspace.
_Avoid_: monorepo, project, repo (when you mean the Workspace), “the app”

**App**:
A deployable Next.js application under `apps/`. Temba has one App, named `temba`.
_Avoid_: package, site, frontend, service

**Package**:
A shared library under `packages/`, consumed with `workspace:*`.
_Avoid_: app, module, library (when you mean a Workspace Package)

**DB Package**:
The Package named `@repo/db`. It owns the Drizzle schema, the database client singleton, kit config, and migrations.
_Avoid_: database (the Postgres instance), schema folder, `~/server/db` (that is the App’s re-export)

**Root**:
The Workspace root. It owns the workspace definition, Turborepo, and the shared Prettier config. It is not an App.
_Avoid_: calling Root “the app” or putting App scripts there

**Route `/public`**:
A stub path in the Temba App that redirects to login.
_Avoid_: Public (EWA Connect’s second App), public app, public package, Community Public (that is a product type)

### Product

**Community**:
A club people belong to. It may contain many Groups and many Teams, may link to at most one Venue, and offers one or more sports.
_Avoid_: Workspace, club, org, server, workspace (when you mean Community)

**Venue**:
A physical facility: one addressable site with a name, location, and Courts. Not a Community, not a legal entity, not a brand. A Community may link to at most one Venue; a Venue may be linked by many Communities.
_Avoid_: club (that is the avoided synonym for Community), facility, location (when you mean this entity), Court (that is a playing surface inside a Venue)

**Court**:
A named playing surface that belongs to one Venue.
_Avoid_: Venue, pitch, field, club (when you mean this entity)

**Group**:
A set of people who play Games of one sport. Every Group is either a Club Group or a Loose Group.
_Avoid_: Community, Team, lobby, channel

**Club Group**:
A Group that belongs to a Community.
_Avoid_: subgroup, channel, nested group

**Loose Group**:
A Group that does not belong to a Community.
_Avoid_: orphan, standalone group, free group

**Community Public**:
A Community joinable by request if you have the Community URL. Owner or Admin may also send a Lookup invite or mint an Invite link (Invite link admits immediately). Listed in Directory when that planned surface ships.
_Avoid_: open Community, listed Community (as the name of the type), Route `/public`

**Community Private**:
A Community joinable by Lookup invite or Invite link from Owner or Admin, or by Owner/Admin Club Group Lookup invite or Invite link that auto-admits as Member then joins the Club Group. No request-to-join.
_Avoid_: secret Community, hidden Community, unlisted Community (when you mean this type)

**Directory**:
A planned App list of live Community Public clubs. Not a shipped surface. Groups are never in the Directory.
_Avoid_: Group directory, marketplace, feed

**Club Group Public**:
A Club Group any Community Member may join. Owner or Admin may also send a Lookup invite or mint an Invite link (accept auto-admits as Member then joins the Group). The Group creator may Lookup-invite existing Members only and cannot mint Invite links.
_Avoid_: open Group (when you mean Club Group Public)

**Club Group Private**:
A Club Group joinable by Lookup invite or Invite link. Owner or Admin may invite any User (accept auto-admits as Member then joins the Group). The Group creator may Lookup-invite existing Members only and cannot mint Invite links.
_Avoid_: secret Group (when you mean Club Group Private)

**Loose Group Public**:
A Loose Group that is not listed; any authenticated User with the Group URL may join. The creator may also send Lookup invites and mint Invite links.
_Avoid_: listed Group, Invite link (that is a different door from Group URL)

**Loose Group Private**:
A Loose Group that is not listed; joinable by Lookup invite or Invite link from the User who created it.
_Avoid_: secret Loose Group

**Lookup invite**:
An in-app invitation to one existing User, found by searching username, email, or phone. The invitee must accept. Staff who may send may revoke unused Lookup invites.
_Avoid_: Email invite, User directory, phone invite, magic link, Invite link

**Email invite**:
Retired as a product door. Do not send named invitations bound to an email address. Leftover Email invite URLs must not admit.
_Avoid_: using this as a current channel; magic link; Invite link; Lookup invite

**Invite link**:
A door URL any authenticated User may use while that token is live. Each copy mints a new token that expires 6 hours after mint; older tokens stay valid until each expires. No rotate or revoke. Used on Community (Public and Private), every Group type, incomplete Team, and Game.
_Avoid_: Email invite, Lookup invite, magic link, Group URL (Loose Group Public still uses the Group URL as a separate join door)

**Venue link**:
A Community’s live association with at most one Venue, after an Operator approves a Venue link request. Owner or Admin may unlink. Distinct from Invite link and from a Team’s Community link.
_Avoid_: Invite link, membership, join, Club Team

**Venue link request**:
A request by a Community Owner or Admin to associate that Community with an existing Venue. An Operator approves or rejects it. Distinct from a User’s Community join request.
_Avoid_: join request (that is a User requesting Community membership), Team link request

**Community sports**:
The allow-list of sports a Community offers (padel, football, or both). Each Group and each Team still has exactly one sport.
_Avoid_: Group sports (that is the single sport on a Group), Team sports (that is the single sport on a Team)

**Team**:
A persistent partnership of exactly two Users for one sport. Distinct from Group. A Team may be incomplete (one member with a pending Lookup invite or live Invite link for the second seat). Every Team is created unattached; it may later link to at most one Community with Owner or Admin approval, and either member may unlink.
_Avoid_: Group, Game team, squad, pair, doubles (when you mean this entity)

**Club Team**:
A Team currently linked to a Community.
_Avoid_: Club Group, nested team

**Loose Team**:
A Team with no Community link (unattached).
_Avoid_: orphan Team, standalone Team, free Team

**Game team**:
One side on a Game: a complete Team or an ad-hoc pair of Users, reused on that Game’s Matches. Not a Team. An Americano has no Game teams until Matches exist.
_Avoid_: Team (when you mean a Game side), partnership, pair (when you mean this entity)

**Owner**:
A Community role. The creator starts as Owner. A Community always has at least one Owner.
_Avoid_: admin (when you mean Owner), founder

**Admin**:
A Community role that helps run the Community (admit people, create Club Groups, archive, request a Venue link) but does not change Owner-ship.
_Avoid_: Owner, moderator, Operator

**Operator**:
A Temba staff User. Not a Community role. Operators curate Venues and Courts and decide Venue link requests.
_Avoid_: Admin (that is a Community role), system admin, platform admin, superadmin, Owner

**Member**:
A Community role with no staff powers. Community membership is required to join that Community’s Club Groups. Leaving a Community is refused while the User sits on any Team linked to that Community.
_Avoid_: player (when you mean Member), user (when you mean this role)

**Soft-archive**:
A reversible hide. For a Community: hides it and its Club Groups together; Games are kept; existing Club Group Games stay visible to those allowed to open the Community or Group and are excluded from public pickup; new Club Group Games are refused; register, waitlist, and Game Lookup/Invite link mint and accept behave as closed; organizers may still add Matches and assign Courts and cannot reopen while archived; Club Groups stay attached; refuse new joins, invites, Team→Community link requests and decisions, Venue link requests and decisions, and invites/accept on already linked Teams; unattached Teams are untouched; linked Team history and stats and a live Venue link remain visible to those allowed to open the Community. For a Venue: hides it from the Community request catalog; refuse new Venue link requests and decisions; live Community Venue links stay; Members still see that Venue on Community home as history. Not a delete, not detaching Groups, and not unlinking a Venue.
_Avoid_: delete, hard-delete, detach, hide (as the name of the action)

**Game**:
The parent event that contains one or more Matches. A Game may belong to a Group and does not belong to a Community directly.
_Avoid_: Event (when you mean Game), session, match (that is a Match)

**Match**:
A playable contest with two sides that belongs to one Game.
_Avoid_: Game (the parent event), session, fixture (when you mean a Match; not a separate entity)

**Set**:
A scored unit inside a Match, added after play. A Match may have any number of Sets.
_Avoid_: Game, Match, game (the padel/tennis point-unit inside a set; not a Temba term)

**Americano**:
A Game format with individual-only registration and rotating partners across multiple Matches. Matches are generated after registration.
_Avoid_: Friendly tournament, Friendly game, tournament, team-only (illegal on this format)

**Friendly tournament**:
A Game format with multiple Matches and the same sides on every Match. The organizer adds each Match by hand.
_Avoid_: Americano, Friendly game, bracket (a later style of Friendly tournament)

**Friendly game**:
A Game format with exactly one Match, created with the Game.
_Avoid_: Single, Friendly tournament, Americano

**Waitlist**:
The queue to join a Game after its cap is reached.
_Avoid_: player (when you mean someone waitlisted), guest

**User**:
A person with a Temba account.
_Avoid_: player (when you mean User), member (when you mean the Community role)
