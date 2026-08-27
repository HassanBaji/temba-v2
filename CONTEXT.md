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
A club people belong to. It may contain many Groups and many Teams and offers one or more sports.
_Avoid_: Workspace, club, org, server, workspace (when you mean Community)

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
A Community listed in the Directory and joinable by request.
_Avoid_: open Community, listed Community (as the name of the type), Route `/public`

**Community Private**:
A Community that is not listed and is joinable only by Email invite or Invite link.
_Avoid_: secret Community, hidden Community

**Directory**:
The list of live Community Public clubs. Groups are never in the Directory.
_Avoid_: Group directory, marketplace, feed

**Club Group Public**:
A Club Group any Community member may join.
_Avoid_: open Group (when you mean Club Group Public)

**Club Group Private**:
A Club Group joinable only by in-app invite, even for Community members.
_Avoid_: secret Group (when you mean Club Group Private)

**Loose Group Public**:
A Loose Group that is not listed; any authenticated User with the Group URL may join.
_Avoid_: listed Group, Invite link (that is a different door for Loose Group Private)

**Loose Group Private**:
A Loose Group that is not listed; joinable by Email invite or Invite link from the User who created it.
_Avoid_: secret Loose Group

**Email invite**:
A named invitation bound to one email address. After Clerk sign-in or sign-up, Temba joins the person only if that account’s email matches.
_Avoid_: magic link, Invite link, mail (when you mean this product)

**Invite link**:
A reusable door URL for a Community Private or Loose Group Private until staff rotate or revoke it. Any authenticated User may use a live Invite link.
_Avoid_: Email invite, magic link, Group URL (Loose Group Public uses the Group URL, not an Invite link)

**Community sports**:
The allow-list of sports a Community offers (padel, football, or both). Each Group and each Team still has exactly one sport.
_Avoid_: Group sports (that is the single sport on a Group), Team sports (that is the single sport on a Team)

**Team**:
A persistent partnership of exactly two Users for one sport. Distinct from Group. A Team may be incomplete (one member with a pending invite for the second seat). Every Team is either a Club Team or a Loose Team. The Community parent is chosen at create time and is immutable.
_Avoid_: Group, Game team, squad, pair, doubles (when you mean this entity)

**Club Team**:
A Team that belongs to a Community.
_Avoid_: Club Group, nested team

**Loose Team**:
A Team that does not belong to a Community.
_Avoid_: orphan Team, standalone Team, free Team

**Game team**:
One side in a single Game (the `game_teams` row). Not a Team.
_Avoid_: Team (when you mean a Game side), partnership

**Owner**:
A Community role. The creator starts as Owner. A Community always has at least one Owner.
_Avoid_: admin (when you mean Owner), founder

**Admin**:
A Community role that helps run the Community (admit people, create Club Groups, archive) but does not change Owner-ship.
_Avoid_: Owner, moderator

**Member**:
A Community role with no staff powers. Community membership is required to join that Community’s Club Groups.
_Avoid_: player (when you mean Member), user (when you mean this role)

**Soft-archive**:
A reversible hide of a Community and its Club Groups. Games are kept. Not a delete, and not detaching Groups.
_Avoid_: delete, hard-delete, detach, hide (as the name of the action)

**Game**:
A match that may belong to a Group. Games do not belong to a Community directly.
_Avoid_: session (when you mean Game), match (in code/docs; Game is the term)

**User**:
A person with a Temba account.
_Avoid_: player (when you mean User), member (when you mean the Community role)
