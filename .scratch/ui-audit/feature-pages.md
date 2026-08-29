# Temba UI/UX Redesign Inventory (Read-Only)

Domain terms follow `CONTEXT.md`: Community, Club Group, Loose Group, Team, Game, Game team, Venue, Court, Operator, Owner/Admin/Member, Email invite, Invite link, Venue link, Soft-archive.

---

## Global architecture

| Layer | Path | Notes |
|-------|------|-------|
| Dashboard layout | `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/layout.tsx` | Server; wraps children in `HydrateClient` + `min-h-screen` |
| Dashboard shell | `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/components/dashboard-shell.tsx` | Client; `SidebarProvider` + `AppSidebar` + `SiteHeader` + content padding `px-4 py-4 md:gap-6 md:px-6 md:py-6` |
| Sidebar nav | `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/components/app-sidebar.tsx` | Home, Groups, Teams, Communities; **Venues** only if Clerk `publicMetadata.operator === true` |
| Operator gate | `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/components/operator-gate.tsx` | Wraps `/dashboard/venues/**` via `venues/layout.tsx` |
| Site header | `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/components/site-header.tsx` | `SidebarTrigger`, title, `AuthHeaderControls`; responsive `lg:px-6 lg:gap-2` |

**Every dashboard feature page is a client component** (`"use client"`). Invite route `page.tsx` files are **server** components that pass `token`, `isSignedIn`, `returnPath` into client accept components.

**No** `loading.tsx`, `error.tsx`, `not-found.tsx`, or `Suspense` anywhere under `apps/temba/src/app`.

**No** `ui/table` usage on feature pages — all lists are styled `<ul>` card rows.

**No** Dialog/Drawer on feature pages. `Sheet` is used only inside `ui/sidebar.tsx` for mobile sidebar.

---

## 1. Home — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/page.tsx`

| | |
|--|--|
| **Component type** | Client |
| **Shell** | `DashboardShell title="Home"` |
| **tRPC** | `api.users.home.useQuery()` |

### UI composition
- Page header: `h2` + muted description (lines 28–36)
- **Overview** stats: `dl` grid `grid-cols-1 sm:grid-cols-3 sm:divide-x` — Games played, Communities count, Groups count (lines 52–77)
- **Upcoming Games**: list or empty card with CTA to Groups (lines 80–131)
- **Standing**: per-Group leaderboard position list or empty card (lines 133–183)
- Primitives: `Badge`, `Button`, `Link`, `Skeleton`

### States
| State | Implementation |
|-------|----------------|
| Loading | 3× `Skeleton` (lines 38–44) |
| Error | `<p className="text-destructive">` (lines 46–48) |
| Empty upcoming | Bordered card + copy + Button → Groups (lines 89–98) |
| Empty standing | Bordered card + copy + Button → Groups (lines 141–150) |
| Unauthorized | Clerk middleware (not page-level) |

### Actions / mutations
None on this page (read-only).

### Responsive
- Overview: `sm:grid-cols-3 sm:divide-x sm:divide-y-0`
- List rows: `flex-col … sm:flex-row sm:items-center sm:justify-between`

---

## 2. Groups

### 2a. Index — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/groups/page.tsx`

| | |
|--|--|
| **tRPC** | `api.groups.mine.useQuery()` |
| **UI** | Header + "Create Group" `Button`; list of joined Groups |
| **Loading** | 2× `Skeleton` (31–36) |
| **Error** | destructive text (38–40) |
| **Empty** | Plain text: "You are not in any Groups yet." (42–46) — **no card/CTA** |
| **List row** | Link → `/dashboard/groups/[id]`; badges for sport, Soft-archived |
| **Responsive** | `sm:flex-row sm:items-center sm:justify-between` on rows |

### 2b. New Loose Group — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/groups/new/page.tsx`

| | |
|--|--|
| **tRPC mutations** | `groups.createLoosePublic`, `groups.createLoosePrivate` (sport hardcoded `"padel"`) |
| **Form pattern** | `useState` + native `<form onSubmit>`; `Field`/`FieldGroup`/`FieldLabel`/`FieldDescription`; `Input`, `Select` |
| **Validation** | HTML `required`, `maxLength={255}`; server Zod on API |
| **Success** | `toast.success` → invalidate `groups.mine` → `router.push` to group home |
| **Layout** | `max-w-lg mx-auto`; form card `rounded-xl border p-6` |

### 2c. Group home — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/groups/[id]/page.tsx` (894 lines, monolithic)

| | |
|--|--|
| **Primary query** | `api.groups.byId.useQuery({ id })` |
| **Conditional queries** | `communities.listMembers` (Club Group Private invites), `groups.listClubPrivateInvites`, `groups.listEmailInvites`, `groups.getInviteLink` |

#### Sections (in order)
1. **Header** — name, type, sport, membership badges, Community link (249–395)
2. **Soft-archive banners** — amber border sections (397–418)
3. **Group stats** — `totalGamesPlayed` (430–447)
4. **Your standing** — 4-col stats grid `md:grid-cols-4` or non-member empty (449–502)
5. **Standing leaderboard** — sorted member list (504–551)
6. **Upcoming Games** — read-only list, **no links to Game detail** (553–600)
7. **Game history** — read-only list (602–650)
8. **In-app invites** (Club Group Private only) — native `<select>` + FormData form (652–738)
9. **Private invites** (Loose Group Private only) — Email invite + Invite link blocks (741–890)

#### Mutations & roles
| Mutation | Who (from API flags) |
|----------|---------------------|
| `joinClubPublic` / `joinLoosePublic` | `canJoin` |
| `acceptClubPrivateInvite` | `canAcceptClubPrivateInvite` |
| `leave` | member |
| `delete` | `canDelete` (empty Group, Owner/Admin or creator) |
| `inviteClubPrivate` / `revokeClubPrivateInvite` | `canInviteClubPrivate` (Owner/Admin or creator) |
| `sendEmailInvite` / `revokeEmailInvite` | `canManageInvites` (Loose Private creator) |
| `createInviteLink` / `rotateInviteLink` / `revokeInviteLink` | same |

#### States
- Header skeleton (251–256), error text (258–260)
- Empty leaderboard, upcoming, history: bordered `px-4 py-6` cards
- No dedicated 404 UI — tRPC NOT_FOUND shows as error message

#### Responsive
- Stats: `md:grid-cols-4 md:divide-x`
- Rows/invite forms: `sm:flex-row`

**Nested components:** none — all inline in page file.

---

## 3. Communities

### 3a. Index — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/communities/page.tsx`

| | |
|--|--|
| **tRPC** | `api.communities.mine.useQuery()` |
| **UI** | Nested list: Community row + indented Club Group sub-rows (`pl-8 border-t`) |
| **Empty** | "You are not in any Communities yet." (plain text) |
| **Empty nested** | "No Groups yet." per Community (78–81) |

### 3b. New — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/communities/new/page.tsx`

| | |
|--|--|
| **tRPC** | `communities.create` — name, type (`public`/`private`), `sports: ["padel"]` |
| **Form** | Same pattern as new Group (useState + Field + Select) |

### 3c. Community home — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/communities/[id]/page.tsx` (1125 lines)

| | |
|--|--|
| **Primary** | `communities.byId` |
| **Conditional** | `listJoinRequests`, `listEmailInvites`, `getInviteLink`, `listTeamLinkRequests`, `searchLiveVenues`, `listMembers` |

#### Sections
| Section | Visibility | Key mutations |
|---------|------------|---------------|
| Header + actions | always | `requestJoin`, `softArchive`/`unarchive`, `leave` |
| Soft-archive banners | archived | — |
| Venue | members | `requestVenueLink`, `unlinkVenue` (Owner/Admin) |
| Groups list + create forms | always | `createClubPublic`, `createClubPrivate` (Owner/Admin) |
| Teams list | members | read-only links |
| Team link requests | `canManageTeamLinks` | `approveTeamLink`, `rejectTeamLink` |
| Members + role select | members | `setMemberRole` (Owner only) |
| Join requests | `canManageJoinRequests` | `approveJoinRequest`, `rejectJoinRequest` |
| Private invites | `canManageInvites` | Email + Invite link (duplicated from Group page) |

#### Role-gated flags (from `byId`)
`canManageJoinRequests`, `canManageInvites`, `canCreateClubGroup`, `canManageRoles`, `canSoftArchive`, `canUnarchive`, `canLeave`, `canManageTeamLinks`, `canRequestVenueLink`, `canUnlinkVenue`

#### Venue UI
- Logo: `<img>` 16×16 when `venue.logoImageUrl` (419–426)
- Courts: bullet list
- Search: `Input` + live results list with "Request link"

---

## 4. Teams

### 4a. Index — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/teams/page.tsx`

| | |
|--|--|
| **tRPC** | `teams.mine`, `teams.pendingInvites` |
| **Sections** | My Teams list + Pending invites section |
| **Mutation** | `acceptInAppInvite` on pending rows |

### 4b. New — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/teams/new/page.tsx`

| | |
|--|--|
| **tRPC** | `teams.create` — optional name, sport `"padel"` |

### 4c. Team home — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/teams/[id]/page.tsx`

| | |
|--|--|
| **tRPC** | `teams.byId`; `communities.mine` when `canRequestLink` |
| **Sections** | Header, Members list, Team stats (`md:grid-cols-3`), Community link request, Partner invite (in-app + Email) |
| **Mutations** | `acceptInAppInvite`, `unlink`, `dissolve`, `requestLink`, `inviteInApp`, `sendEmailInvite`, `revokeInAppInvite`, `revokeEmailInvite` |
| **Access** | FORBIDDEN if not member, Community member (linked), or invitee |

---

## 5. Venues (Operator only)

**Layout:** `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/venues/layout.tsx` → `OperatorGate`

### 5a. Index — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/venues/page.tsx`

| | |
|--|--|
| **tRPC** | `venues.list`, `venues.listPendingLinkRequests` |
| **Sections** | Pending Venue link requests (approve/reject) + Venue catalog list |
| **Procedures** | `operatorProcedure` — requires Clerk `operator` metadata |

### 5b. New — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/venues/new/page.tsx`

| | |
|--|--|
| **tRPC** | `venues.create` |
| **Fields** | name, city, country, optional lat/long via `parseOptionalCoord` |

### 5c. Venue home — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/dashboard/venues/[id]/page.tsx`

| | |
|--|--|
| **tRPC** | `venues.byId`, `update`, `addCourt`, `renameCourt`, `deleteCourt`, `uploadLogo`, `clearLogo`, `softArchive`, `unarchive` |
| **Sections** | Soft-archive banner, Linked Communities, edit form, Logo upload (file → base64), Courts CRUD |
| **Logo** | Client validation: JPEG/PNG/WebP, 2MB max; displays `logoImageUrl` public URL |
| **Layout** | `max-w-2xl mx-auto` |

**Non-Operator unauthorized:** `OperatorGate` shows "You do not have access to this area." (no redirect).

---

## 6. Invites

### Routes (all server `page.tsx` + client accept component)

| Route | Page | Component | Preview tRPC | Accept tRPC |
|-------|------|-----------|--------------|-------------|
| `/invites/community/email/[token]` | `…/community/email/[token]/page.tsx` | `accept-community-email-invite.tsx` | `communities.previewEmailInvite` | `communities.acceptEmailInvite` |
| `/invites/community/link/[token]` | `…/community/link/[token]/page.tsx` | `accept-community-invite-link.tsx` | `communities.previewInviteLink` | `communities.acceptInviteLink` |
| `/invites/group/email/[token]` | `…/group/email/[token]/page.tsx` | `accept-group-email-invite.tsx` | `groups.previewEmailInvite` | `groups.acceptEmailInvite` |
| `/invites/group/link/[token]` | `…/group/link/[token]/page.tsx` | `accept-group-invite-link.tsx` | `groups.previewInviteLink` | `groups.acceptInviteLink` |
| `/invites/team/email/[token]` | `…/team/email/[token]/page.tsx` | `accept-team-email-invite.tsx` | `teams.previewEmailInvite` | `teams.acceptEmailInvite` |

### Shell — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/components/invites/invite-shell.tsx`
- Full-viewport gradient background; centered card `max-w-md rounded-2xl border bg-black/30`
- Temba logo link + Clerk sign-in note

### Accept component flow (all 5 nearly identical)
1. `preview.*.useQuery({ token })` — public procedure
2. If signed in + `status === "ready"`: auto-`accept.mutate` via `useEffect`
3. States: loading Skeleton → invalid/unavailable → unsigned (Clerk SignIn/SignUp) → accepting spinner → error → redirect on success

**No forms, dialogs, or tables** on invite pages.

---

## 7. Root routes

### `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/page.tsx`
- **Server** async; Clerk `auth()` → redirect `/dashboard` if signed in, else `/login`

### `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/app/public/page.tsx`
- **Server**; `redirect("/login")` — stub per CONTEXT.md (not Community Public)

---

## 8. Games — UI surface & schema

### UI surface today
**No dedicated Game routes, pages, or CRUD UI.**

Games appear only as **read-only lists** embedded in:
- **Home** (`dashboard/page.tsx` lines 80–131): upcoming Games from user's Groups
- **Group home** (`groups/[id]/page.tsx` lines 553–650): upcoming + history

Each row shows: name, start time, sport badge, status badge. **No scores, Game teams, Court, Venue, or detail links.**

### tRPC Game API (mostly unused by UI)
| Procedure | Status |
|-----------|--------|
| `games.listPublicPickup` | Implemented; **no UI consumer** (only invalidated on Community archive/unarchive) |
| `games.create` | **Empty stub** |
| `games.hello`, `games.getSecretMessage` | Scaffold leftovers |

### Standing / ratings
- **Standing** = Group-member counters sorted by sets won → points won → Games played → name (`server/standing/compare-standing.ts`)
- **No ELO**, no global ranking, no rating UI
- **Team stats**: `gamesPlayed`, `wins`, `losses` on `teams` table
- **User**: `numberOfGamesPlayed` on `user` table
- **Only rating-like column**: `game_players.selfPerformanceRating` (integer) — **not exposed in UI**

### Game-related schema tables

#### `games` — `/Users/hassanhaji/Documents/temba-v2/packages/db/src/schema/games.ts`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| name | varchar(255) | |
| courtId | uuid FK → **venues.id** | ADR-0007 legacy; not `courts` |
| startTime, endTime | timestamp | |
| durationInMinutes | integer | |
| totalPrice, pricePerPlayer | decimal | |
| maxPlayers | integer | |
| status | enum pending/confirmed/completed/cancelled | |
| sport | enum padel/football | |
| setsPlayed | integer | |
| statusUpdatedAt | timestamp | |
| createdBy | uuid FK user | |
| isPublic | boolean | public pickup flag |
| groupId | uuid FK groups (nullable) | |
| createdAt, updatedAt | timestamp | |

Relations: court→venues, createdBy→user, group→groups, players→gamePlayers, teams→gameTeams

#### `game_teams` — `packages/db/src/schema/game-teams.ts`
| Column | Notes |
|--------|-------|
| gameId | FK games |
| teamId | FK teams (nullable — optional link to persistent Team) |
| name | side label |
| setsWon, setsLost | score counters |

#### `game_players` — `packages/db/src/schema/game-players.ts`
| Column | Notes |
|--------|-------|
| gameId, userId | FKs |
| playerType | enum player/guest |
| name | guest name |
| addedBy | FK user |
| setsWon, setsLost | |
| paidAt, paidAmount | payment |
| **selfPerformanceRating** | integer — unused in UI |

#### `game_team_players` — join game_teams ↔ game_players

#### Counter tables (standing source)
- `group_members`: `totalGamesPlayed`, `totalPointsWon`, `totalSetsWon`
- `groups`: `totalGamesPlayed`
- `teams`: `gamesPlayed`, `wins`, `losses`
- `user`: `numberOfGamesPlayed`, `numberOfCoachingSessions`

---

## 9. Full tRPC router inventory

Root: `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/server/api/root.ts`

### `users` — `/Users/hassanhaji/Documents/temba-v2/apps/temba/src/server/api/routers/users.ts`
| Procedure | Type | Description |
|-----------|------|-------------|
| `home` | query (protected) | Returns `gamesPlayed`, `communitiesCount`, `groupsCount`, `upcomingGames[]`, `standing[]` per Group membership |

### `groups` — `…/routers/groups.ts` (30 procedures)
| Procedure | Type | Description |
|-----------|------|-------------|
| `createClubPublic` | mutation | Owner/Admin creates Club Group Public; caller joins |
| `createClubPrivate` | mutation | Owner/Admin creates Club Group Private |
| `createLoosePublic` | mutation | Creates Loose Group Public outside Community |
| `createLoosePrivate` | mutation | Creates Loose Group Private |
| `mineLoose` | query | Loose Groups caller belongs to (**unused by current UI**) |
| `mine` | query | All Groups caller belongs to, with Community summary |
| `byId` | query | Full Group home payload: membership, standing, games, flags, invites |
| `joinClubPublic` | mutation | Community member joins Club Group Public |
| `joinLoosePublic` | mutation | Authenticated User joins Loose Group Public via URL |
| `leave` | mutation | Leave Group |
| `delete` | mutation | Delete empty Group (no Games, creator-only members) |
| `inviteClubPrivate` | mutation | In-app invite Community member to Club Group Private |
| `listClubPrivateInvites` | query | Pending in-app invites for Club Group Private |
| `revokeClubPrivateInvite` | mutation | Revoke in-app invite |
| `acceptClubPrivateInvite` | mutation | Accept in-app invite |
| `sendEmailInvite` | mutation | Loose Group Private Email invite |
| `listEmailInvites` | query | Unused Email invites for Loose Group Private |
| `revokeEmailInvite` | mutation | Revoke Email invite |
| `getInviteLink` | query | Active Invite link or null |
| `createInviteLink` | mutation | Create reusable Invite link |
| `rotateInviteLink` | mutation | Revoke old + create new Invite link |
| `revokeInviteLink` | mutation | Revoke Invite link |
| `previewEmailInvite` | query (public) | Token preview for invite page |
| `previewInviteLink` | query (public) | Token preview for invite page |
| `acceptEmailInvite` | mutation | Accept Loose Group Private Email invite |
| `acceptInviteLink` | mutation | Accept Loose Group Private Invite link |

### `communities` — `…/routers/communities.ts` (32 procedures)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | mutation | Create Community; caller becomes Owner |
| `byId` | query | Community home payload with flags, venue, groups, teams |
| `listMembers` | query | Members list (members only) |
| `setMemberRole` | mutation | Owner promotes/demotes |
| `softArchive` / `unarchive` | mutation | Soft-archive Community |
| `leave` | mutation | Leave + remove from Club Groups |
| `addSport` / `removeSport` | mutation | Sports allow-list (**no UI today**) |
| `listTeamLinkRequests` | query | Pending Team→Community link requests |
| `approveTeamLink` / `rejectTeamLink` | mutation | Decide link request |
| `mine` | query | Communities with nested Club Groups |
| `requestJoin` | mutation | Community Public join request |
| `listJoinRequests` | query | Pending join requests |
| `approveJoinRequest` / `rejectJoinRequest` | mutation | Admit or refuse |
| `sendEmailInvite` / `listEmailInvites` / `revokeEmailInvite` | mutation/query | Community Private Email invites |
| `getInviteLink` / `createInviteLink` / `rotateInviteLink` / `revokeInviteLink` | query/mutation | Community Private Invite link |
| `previewEmailInvite` / `previewInviteLink` | query (public) | Invite page previews |
| `acceptEmailInvite` / `acceptInviteLink` | mutation | Accept Community invites |
| `searchLiveVenues` | query | Owner/Admin search non-archived Venues |
| `requestVenueLink` | mutation | Request Venue link |
| `unlinkVenue` | mutation | Remove live Venue link |

### `teams` — `…/routers/teams.ts` (18 procedures)
| Procedure | Type | Description |
|-----------|------|-------------|
| `create` | mutation | Create unattached Team |
| `mine` | query | Teams caller sits on |
| `pendingInvites` | query | In-app partner invites for caller |
| `byId` | query | Team home with members, stats, invite/link flags |
| `inviteInApp` | mutation | Invite existing User by email |
| `listInAppInvites` | query | (**unused by UI**) |
| `revokeInAppInvite` | mutation | Revoke in-app invite |
| `acceptInAppInvite` | mutation | Accept partner invite |
| `sendEmailInvite` / `revokeEmailInvite` | mutation | Email partner invite |
| `previewEmailInvite` | query (public) | Invite page preview |
| `acceptEmailInvite` | mutation | Accept Email invite |
| `requestLink` | mutation | Request Community link |
| `unlink` | mutation | Unlink from Community |
| `dissolve` | mutation | Delete Team |

### `venues` — `…/routers/venues.ts` (14 procedures, all `operatorProcedure`)
| Procedure | Description |
|-----------|-------------|
| `list` | All Venues including Soft-archived |
| `byId` | Venue + courts + linked Communities |
| `create` / `update` | Venue CRUD |
| `addCourt` / `renameCourt` / `deleteCourt` | Court CRUD |
| `uploadLogo` / `clearLogo` | Supabase Storage logo |
| `softArchive` / `unarchive` | Venue Soft-archive |
| `listPendingLinkRequests` | Pending Venue link requests |
| `approveLinkRequest` / `rejectLinkRequest` | Operator decides link |

### `games` — `…/routers/games.ts`
| Procedure | Description |
|-----------|-------------|
| `hello` | Scaffold greeting |
| `listPublicPickup` | Public pickup Games (excludes archived Community Groups) |
| `create` | **Stub — no implementation** |
| `getSecretMessage` | Scaffold |

---

## 10. Drizzle schema — all tables

Path prefix: `/Users/hassanhaji/Documents/temba-v2/packages/db/src/schema/`

### Core identity
| Table | Key columns | Relations |
|-------|-------------|-----------|
| **user** | id, name, email, username, **image**, phone, emailVerified, **numberOfGamesPlayed**, **numberOfCoachingSessions**, createdAt, updatedAt | accounts, sessions |
| account, session, verification | Clerk/auth plumbing | |

### Community domain
| Table | Key columns |
|-------|-------------|
| **communities** | name, description, type (public/private), createdBy, **archivedAt**, **venueId**, timestamps |
| **community_members** | communityId, userId, **role** (owner/admin/member), timestamps |
| **community_sports** | communityId, sport |
| **community_join_requests** | communityId, userId, status, decidedBy |
| **community_email_invites** | communityId, email, token, userId, invitedBy, acceptedAt, revokedAt |
| **community_invite_links** | communityId, token, createdBy, revokedAt |

### Group domain
| Table | Key columns |
|-------|-------------|
| **groups** | name, description, type, sport, communityId, createdBy, **totalGamesPlayed**, timestamps |
| **group_members** | groupId, userId, **totalGamesPlayed**, **totalPointsWon**, **totalSetsWon**, timestamps |
| **group_member_invites** | Club Group Private in-app invites |
| **group_email_invites** | Loose Group Private Email invites |
| **group_invite_links** | Loose Group Private Invite links |

### Team domain
| Table | Key columns |
|-------|-------------|
| **teams** | name, sport, communityId, createdBy, **gamesPlayed**, **wins**, **losses**, timestamps |
| **team_members** | teamId, userId, timestamps |
| **team_member_invites** | in-app partner invites |
| **team_email_invites** | Email partner invites |
| **team_link_requests** | teamId, communityId, status, requestedBy, decidedBy |

### Venue domain
| Table | Key columns |
|-------|-------------|
| **venues** | name, city, country, lat/long, phone, website, **logoImageUrl**, **archivedAt**, timestamps |
| **courts** | venueId, name, timestamps |
| **venue_link_requests** | communityId, venueId, status, requestedBy, decidedBy |

### Game domain (see §8)
games, game_teams, game_players, game_team_players

### Coaching (schema only — **no UI**)
| Table | Key columns |
|-------|-------------|
| **coach** | sport, name, contact, **imageUrl**, courtId→venues, isActive |
| **coaching_session** | coachId, times, price, status, courtId→venues |
| **coaching_session_players** | session participants |

### Avatars / logos / images
- **User avatar**: `user.image` — **not displayed anywhere in dashboard pages today**
- **Venue logo**: `venues.logoImageUrl` — Operator upload; shown on Community home (members) and Venue home
- **Coach image**: `coach.imageUrl` — no UI

---

## 11. Loading & empty state patterns

### Loading
| Pattern | Where used |
|---------|------------|
| `query.isLoading` + `Skeleton` blocks | All index pages, detail headers, invite previews, OperatorGate |
| `mutation.isPending` + disabled Button + "…ing" label | All forms/actions |
| **No** route-level `loading.tsx` | — |
| **No** `Suspense` | — |
| **No** spinners (Loader icon) | — |

### Error
| Pattern | Where |
|---------|-------|
| `<p className="text-destructive text-sm">{error.message}</p>` | Every tRPC query on dashboard pages |
| Invite accept errors | Dedicated "Could not join" card + dashboard link |
| Toast `toast.error(error.message)` | All mutations |
| **No** error boundaries / `error.tsx` | — |

### Empty states — two tiers
**Tier A — rich card** (border + padding + sometimes CTA):
```89:98:apps/temba/src/app/dashboard/page.tsx
              {home.data.upcomingGames.length === 0 ? (
                <div className="border-border bg-card space-y-3 rounded-xl border px-4 py-6">
                  <p className="text-muted-foreground text-sm">
                    No upcoming Games in your Groups. When a Group schedules a
                    pending or confirmed Game, it will show up here.
                  </p>
                  <Button asChild size="sm">
                    <Link href="/dashboard/groups">Groups</Link>
                  </Button>
                </div>
```

**Tier B — plain muted text** (most index empties):
```42:46:apps/temba/src/app/dashboard/groups/page.tsx
        {groups.data?.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You are not in any Groups yet.
          </p>
        ) : null}
```

**Soft-archive banner** (shared amber pattern):
```397:406:apps/temba/src/app/dashboard/groups/[id]/page.tsx
        {group.data?.isCommunityArchived && !group.data.communityMembership ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6">
            <h3 className="text-foreground text-lg font-medium">
              This Club Group&apos;s Community is Soft-archived
            </h3>
            <p className="text-muted-foreground mt-2 text-sm">
              It is not open for join. Members of the Community can still open
              history and Games. This is not a missing page.
            </p>
          </section>
```

### Consistency gaps
- Index empties: Groups/Communities/Teams/Venues = plain text; Home = card + CTA
- Detail pages: no skeleton for full page — only header skeleton while rest empty
- Members list on Community home: no empty copy when `members.data` is empty array
- Unauthorized: OperatorGate only; other FORBIDDEN = tRPC error text

---

## 12. Forms

| Aspect | Implementation |
|--------|----------------|
| **Library** | **No react-hook-form** anywhere in `apps/temba/src` |
| **State** | `useState` for controlled fields on create/edit pages |
| **Submit** | Native `<form onSubmit>` with `preventDefault` |
| **Inline forms** | `FormData` + native `<select>` (invites, link requests, club group create on Community home) |
| **Validation** | HTML (`required`, `type="email"`, `maxLength`); Zod on tRPC boundary; client logo type/size check on Venue home |
| **`ui/field.tsx`** | shadcn field primitives: `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, **`FieldError` (defined but never used in pages)** |
| **Errors** | tRPC → `toast.error(error.message)`; query errors → inline destructive text |
| **Success** | `toast.success(...)` + `utils.*.invalidate()` + optional clipboard + `router.push/replace` |
| **Server actions** | None |
| **Dialogs/Sheets** | Not used for forms |

Create pages using Field pattern: `groups/new`, `communities/new`, `teams/new`, `venues/new`, `venues/[id]` edit form.

---

## 13. Shared vs page-specific / duplication targets

### Shared (reuse today)
| Component | Path | Used by |
|-----------|------|---------|
| `DashboardShell` | `components/dashboard-shell.tsx` | All dashboard pages |
| `InviteShell` | `components/invites/invite-shell.tsx` | All invite routes |
| `OperatorGate` | `components/operator-gate.tsx` | Venues layout |
| `AppSidebar` / `SiteHeader` / `NavMain` | `components/` | Via shell |
| UI primitives | `components/ui/*` | badge, button, input, select, skeleton, field, sidebar |

### Duplicated markup — prime redesign primitives

#### A. Index list row (appears ~8×)
```52:55:apps/temba/src/app/dashboard/groups/page.tsx
                <Link
                  href={`/dashboard/groups/${group.id}`}
                  className="hover:bg-muted/50 flex flex-col gap-2 px-4 py-4 transition sm:flex-row sm:items-center sm:justify-between"
                >
```
Same classes on Communities, Teams, Venues index, Home game/standing rows, nested Community Groups.

**→ Extract:** `EntityListRow` or `DashboardLinkRow`

#### B. Bordered list container
```49:49:apps/temba/src/app/dashboard/groups/page.tsx
          <ul className="divide-border border-border bg-card divide-y rounded-xl border">
```
Used on every list section.

**→ Extract:** `CardList` / `DashboardList`

#### C. Section admin card
```653:653:apps/temba/src/app/dashboard/groups/[id]/page.tsx
          <section className="border-border bg-card space-y-4 rounded-xl border p-6">
```
Repeated for invites, members, venue, team links on Community/Group/Team pages.

**→ Extract:** `DashboardSection`

#### D. Stats grid (`dl`)
Home overview (3-col), Group standing (4-col), Team stats (3-col) — same `divide-y md:grid-cols-N md:divide-x` pattern.

**→ Extract:** `StatGrid` / `MetricCard`

#### E. Email invite + Invite link block (~3× near-identical)
Community home lines 980–1119, Group home lines 753–888 — same structure: email form, invite list with Copy/Revoke, invite link Create/Copy/Rotate/Revoke.

**→ Extract:** `PrivateInvitesPanel` with props for tRPC namespace

#### F. Pending request row (approve/reject)
Venue link requests, Team link requests, Join requests, Club private invite list — same `flex-col gap-3 sm:flex-row sm:items-center sm:justify-between` + two Buttons.

**→ Extract:** `ActionListRow`

#### G. Accept invite components (5× ~95% identical)
All under `components/invites/accept-*.tsx` — only differ by preview/accept procedure and redirect path.

**→ Extract:** single `AcceptInviteFlow` parameterized by router + entity label

#### H. Soft-archive amber banner (4×)
Group, Community, Venue detail pages.

**→ Extract:** `SoftArchiveBanner`

#### I. Role badge / type display
Scattered `<Badge variant="outline">` for Soft-archived, Club Team, sport, type — no shared `RoleBadge` or `EntityBadges`.

#### J. `formatGameStart` duplicated
`dashboard/page.tsx` lines 11–20 and `groups/[id]/page.tsx` lines 15–24 — identical function.

**→ Extract:** `lib/format-game-start.ts`

#### K. `parseOptionalCoord` / `coordToInput` duplicated
`venues/new/page.tsx` and `venues/[id]/page.tsx`.

#### L. `teamDisplayName` duplicated
Server-side in `communities.ts` and `teams.ts` routers (not shared util).

### Page-specific (intentionally monolithic)
- `communities/[id]/page.tsx` — 1125 lines, all sections inline
- `groups/[id]/page.tsx` — 894 lines
- No extracted feature components under `components/groups/`, `components/communities/`, etc.

---

## Redesign implications (concise)

1. **Games** have rich schema (scores, Game teams, payments, public pickup) but **minimal UI** — biggest greenfield surface; bind to existing `groups.byId` game lists + unimplemented `games.*` procedures.
2. **Standing** is counter-based within Groups — redesign can surface leaderboard UX without new API if counters stay authoritative.
3. **No ELO/ratings** in schema except unused `selfPerformanceRating`.
4. **Forms/toasts** pattern is consistent but primitive — no field-level errors, no modals for destructive actions (delete/dissolve are immediate button clicks).
5. **Operator Venues** are gated twice (sidebar + layout) with plain unauthorized message.
6. **Coaching/coach** tables exist with zero UI.
7. **User avatars** (`user.image`) unused in member lists — opportunity for richer member rows.
8. Highest-value extractions before visual redesign: list rows, section cards, invite panels, accept-invite flow, stat grids, soft-archive banner.

[REDACTED]