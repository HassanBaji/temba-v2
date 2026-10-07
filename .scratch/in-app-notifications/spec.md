# In-app Notifications for Group and Game admins, and Finished Game notices for players

Status: approved, ready for implementation. Every open question was answered on 2026-10-07; the answers are recorded in section 5.1.

Tickets: drafted in section 13. Not yet in Linear, because Linear was not authenticated when this spec was written.

## 1. Problem

The people who run a Group or a Game cannot tell when something happens on it unless they open it and look. A Group approver does not know that someone joined their Loose Group Public through the Group URL. An Organizer does not know that a seat opened because someone left, or that someone came off the Waitlist into that seat. Nobody, admin or player, is told when every Match on a Game is settled. Temba has no notification system of any kind. There is no table, no email, no push, no activity feed and no polling.

The user asked for in-app notifications on the Web App, starting with four events:

- someone joined the Group (to Group admins)
- someone joined the Game (to Game admins)
- someone left the Game (to Game admins)
- the Game has finished (to Game admins and to the Game's players)

## 2. Discovery findings

### 2.1 Who "admins" are in the existing model

The request names "game creators and game admins, group admins". None of these is a Temba term. The glossary maps them as follows.

| Request wording | Temba term | Where the rule lives | Who it is |
| --- | --- | --- | --- |
| game creators and game admins | **Organizer** | `packages/api/src/games/access.ts`: `isGameOrganizer`, private `mayOrganizeGroupGames` | On a Group Game: the Group's creator, plus Community Owner and Admin on a Club Group. On a groupless (legacy) Game: `games.created_by`. |
| group admins | **Group approver** | `packages/api/src/groups/helpers/is-group-approver.ts`: `isGroupApprover` | On a Loose Group: the creator. On a Club Group: Community Owner or Admin, or the Group creator while still a Community Member. Nobody while the Community is Soft-archived. |

Facts that shape the design:

- **There is no Game admin or co-host concept.** No column or table holds Game-level admins. The Organizer set is derived from the Game's Group (`groups.created_by`, and `community_members.role in (owner, admin)`).
- **The Game's own creator is not separately an Organizer on a Group Game.** `games.created_by` had to be an Organizer at create time (`assertMayCreateGameOnGroup`). If that person is later demoted from Admin, or leaves the Community, they are no longer an Organizer.
- **Organizers and Group approvers differ in exactly two cases on a Group Game.**
  1. `mayOrganizeGroupGames` treats a Club Group's creator as an Organizer even after they leave the Community. `isGroupApprover` requires a current Community seat.
  2. `isGameOrganizer` ignores Soft-archive. `isGroupApprover` returns false for everyone while the Community is Soft-archived.
- **Leaving a Community** (`packages/api/src/community-membership/leave.ts`) deletes the User's `group_members` rows on that Community's Club Groups. It does **not** remove their `game_players` rows. A User who left can still be a registered player on a Club Group Game.
- Both rules exist only as per-User predicates today. Fan-out needs the matching **set**: "every User for whom the predicate is true". Set resolvers must be added beside the predicates, so each rule stays in one file (section 7.2).

Schema: `packages/db/src/schema/groups.ts` (`created_by`, `community_id`), `group-members.ts`, `community-members.ts` (`role`), `communities.ts` (`archived_at`), `games.ts` (`group_id`, `created_by`, `cancelled_at`, `window_start`, `window_end`), `game-players.ts`.

### 2.2 Event 1: someone joined the Group

There is no shared "Group admit" module. A `group_members` row is inserted in five places:

| Door | File | Transaction today |
| --- | --- | --- |
| Loose Group Public URL join | `packages/api/src/routers/groups/joinLoosePublic.ts` (`joinLoosePublic`) | none |
| Club Group Public join by a Member | `packages/api/src/routers/groups/joinClubPublic.ts` (`joinClubPublic`) | none |
| Group join request approved | `packages/api/src/routers/groups/approveJoinRequest.ts` (`approveJoinRequest`) | yes |
| Group Invite link accepted | `packages/api/src/invites/doors/accept-link.ts`, the `hostKind === "group"` branch, called from `routers/groups/acceptInviteLink.ts` | caller's handle |
| Group Lookup invite accepted | `packages/api/src/invites/doors/accept-lookup.ts`, the `host.kind === "group"` branch, called from `routers/groups/acceptLookupInvite.ts` | caller's handle |

The creator's own membership row is inserted at Group create (`groups/helpers/create-loose-group.ts`, `create-club-group.ts`). That is not a join and must not notify.

### 2.3 Event 2: someone joined the Game

Every new occupancy goes through the shared **Game admit** module, `admit()` in `packages/api/src/games/admit.ts`. It returns `{ ok: true, placement }` on success. Its callers:

| Door | File | `door` | Party |
| --- | --- | --- | --- |
| Americano register | `routers/games/register.ts` | `register` | user (runs **without** a transaction today) |
| Pick a seat | `routers/games/registerSeat.ts` | `register` | user with seat |
| Partner registration | `routers/games/registerWithPartner.ts` | `register` | pair; `userIds[0]` is the caller |
| Complete Team | `routers/games/registerTeam.ts`, via `games/invites.ts` `admitCompleteTeam` | `register` | team |
| Game Lookup invite and Invite link accept | `games/invites.ts` (`admitIndividualUser`), via `invites/doors/accept-lookup.ts` and `accept-link.ts` | `register` | user |
| Waitlist promotion | `games/promote-waitlist.ts` (`promoteWaitlist`) | `promote` | user or team |

Promotion runs inside the leave or kick transaction, through `games/leave-registered-seat.ts`. It is the only way someone joins a Game without acting at that moment.

Not a join: joining the Waitlist (`enqueue-waitlist-user.ts`, `enqueue-waitlist-team.ts`). `registerSeat.ts` also has a leftover path where a User who is already registered but has no seat calls `occupySeat` directly; that is re-seating, not a join. `mergeHalfTeams.ts` is an Organizer merging two Half teams, not a join.

### 2.4 Event 3: someone left the Game

- The door is `games.leave`: `routers/games/leave.ts` (`leaveGame`). It wraps the shared `leaveRegisteredSeat` in `games/leave-registered-seat.ts` in a transaction. It is refused once the Pool draw is posted. It does not check Soft-archive, so a leave in a Soft-archived Community succeeds.
- **On a Friendly tournament that does not allow registering alone, before the Pool draw**, leaving removes the whole Game team (`removeGameTeamAndPlayers`). The partner is removed too.
- Not a leave: `games.kick` (`routers/games/kick.ts`), which is an Organizer removing someone and also calls `leaveRegisteredSeat`. `games.leaveWaitlist` (`routers/games/leaveWaitlist.ts`) is leaving the queue, not giving up occupancy.

### 2.5 Event 4: the Game has finished

**There is no "finished" state on a Game.** `games` has `cancelled_at` and `registration_closed_at`, but no completion column. Match status (`pending`, `confirmed` (unused, ADR-0011), `completed`, `cancelled`) lives on each Match. Lists derive "live" from time and Match status in `packages/api/src/home/upcoming-games.ts` (`isGameLive`).

A Match becomes settled at these points:

- `games/run-match-completion-effect.ts` (`runMatchCompletionEffect`), the automatic completion once every seated User has confirmed. Called from `routers/games/scoreSet.ts` and `routers/games/confirmMatchResult.ts`.
- `routers/games/completeMatch.ts`, the Organizer's force-complete.
- `routers/games/cancelMatch.ts`: a Pool Match voided, or a Knockout Match settled as a Walkover through `awardKnockoutWalkover` in `games/knockout-advance.ts`. Cancelling the Match of a Friendly game cancels the whole Game (`cancelGameRecord`), which is not "finished".
- `routers/games/kick.ts`, which cancels a removed Game team's unplayed Pool Matches after the draw.

Every Match of a drawn Friendly tournament, Knockout rounds included, is created when the draw is posted (`routers/games/postPoolDraw.ts`), so "all settled" is reached only once the last Match is settled. `routers/games/reportWrongScore.ts` can put a completed Match back to `pending`, which takes a Game from finished back to not finished. `routers/games/addMatch.ts` can add a Match to a Friendly tournament with no Knockout after the Game finished, which does the same.

**Americano has no Matches today.** `addMatch` accepts only Friendly tournaments, and `cancelMatch` refuses an Americano. Nothing in the API App runs on a schedule.

**Who is a player at finish time.** Every registered occupant has a `game_players` row: a seat holder, both Users of a Partner registration, and both members of a complete Team (`games/seats.ts` `occupySeat` inserts one row per User). Waitlisted Users and Teams have no row. Leave and kick delete the row. That includes the post-draw path in `leaveRegisteredSeat`, which deletes every occupant of the removed Game team.

### 2.6 Existing infrastructure to reuse

- **No notification, email, push, activity-feed or polling infrastructure exists.** No `refetchInterval` anywhere in the Web App. No `EventSource` or WebSocket. Phase 7 of `.scratch/mobile-and-api-server/spec.md` plans push tokens and sends "on the chosen events", and says that phase needs its own spec.
- **A bell already exists.** `apps/web/src/components/home/home-header.tsx` renders a `BellIcon` link to `/dashboard/invites`, with an ink dot when `pendingInviteCount > 0`. It shows only on Home. The desktop rail (`components/layout/app-rail.tsx`) has no bell. `/dashboard/invites` (`app/dashboard/invites/page.tsx`) merges the four `pendingLookupInvites` queries into one inbox of actionable invites.
- Soft-archive is consulted through the shared `consult` in `packages/api/src/soft-archive` (`consult(database, { clubGroupGame: { groupId } })`, `consult(database, { clubGroupId })`, `.freeze("host")`).
- Web tRPC: `apps/web/src/trpc/react.tsx`, `query-client.ts` (default `staleTime` 30 s). React Query's `refetchInterval` is available and pauses in background tabs by default.
- The API App is a long-lived Node process on Railway (D3 in the mobile spec). The web App reaches it through the same-origin `/api/*` rewrite (D1).

## 3. Goals

1. Each of the four events writes at most one Notification per User who should hear about it, in the same transaction as the event.
2. A User never receives a Notification about their own action.
3. A Soft-archived Community produces no Notifications, and nobody is notified as an admin of something they no longer run.
4. The Web App shows a bell with an unread dot. It opens a Notifications page that lists Notifications newest first. Each row links to the Group or Game it is about.
5. Users can mark one Notification read, by opening it, or mark all read.
6. The bell reflects new Notifications within about a minute, without a page reload, using only what Railway and Hono already provide.
7. The procedures are additive and client-neutral, so the Mobile App can use them later, and Phase 7 push can be added on top without changing them.

## 4. Non-goals

- Mobile App screens. The procedures are built for reuse; no Expo work happens here.
- Push, email or SMS delivery. Phase 7.
- Notifications to players for anything other than Finished Game. Also out: notices to the joiner ("your request was approved"), and Waitlist join, kick, cancel, Match result, invite or Community join events.
- Finished Game for Americano. Deferred until Americano has Matches (decision 2), not rejected.
- Per-User notification preferences, muting, or per-Group opt-out.
- Real-time transport (SSE, WebSocket, Postgres LISTEN/NOTIFY).
- Grouping or collapsing several events into one row ("3 people joined").
- A time-based "the Game ended, add the score" nudge. It needs a scheduler.
- Changing who may act as an Organizer or a Group approver. The edge-case exclusions in 6.2 only decide who gets a Notification. `isGameOrganizer` and `isGroupApprover` are unchanged.

## 5. Decisions

### 5.1 Answered by the user on 2026-10-07

| # | Question | Decision |
| --- | --- | --- |
| 1 | What does "the Game has finished" mean? | Every Match is completed or cancelled, with at least one completed. Trigger: a check after each Match settlement, in the same transaction, firing once per Game ever. |
| 2 | Americano | Excluded for now. **Deferred, not rejected.** Revisit when Americano gets Matches or a time-based finish. |
| 3 | Should Group approvers also get Game Notifications for Games in their Group? | **Yes.** The Game admin audience is Organizers ∪ Group approvers, de-duplicated, with the actor excluded. The edge cases are handled, not accepted. A Club Group creator who left the Community gets no admin Notifications for that Club Group. A Soft-archived Community produces no Notifications. Full table in 6.2. |
| 4 | Should the Game's creator always be notified? | **No.** Someone who has lost Organizer status, and is not a Group approver, is not notified. |
| 5 | Should Finished Game go to players too? | **Yes.** It goes to the Game's players: Users with a `game_players` row at finish time, meaning seat holders, Partner registration partners and Team members. Waitlisted, kicked and left Users are not players. Each User gets exactly one Notification, with admin copy if they are both. Player copy differs from admin copy. |
| 6 | Retention | **90 days**, purged on write. |
| 8 | One bell or two? | **One bell** covering Notifications and pending invites. It opens `/dashboard/notifications`, which links to the unchanged `/dashboard/invites`. |
| Q-A | Is a Game whose Matches are all cancelled, with none completed, a Finished Game? | **No. It is treated as a cancelled Game:** not finished, no Notification (E13, E14). |
| Q-B | Does a Club Group creator who left the Community still get the player Finished Game notice if still registered? | **Yes.** Only their admin Notifications stop (E1). |
| 7 | Does opening the Notifications page mark everything read? | **No.** A row becomes read on click or through "Mark all as read" (D9). |
| 9 | Copy | **The table in 7.6, as written.** |
| 10 | Should the User who settles the last Match get Finished Game? | **Yes.** It is a system event with no actor (E17). |
| 11 | Does landing on the Waitlist count as joining? | **No.** Only Game admit counts. |

### 5.2 Design decisions

**D1. Audiences.** Two audiences are defined in 6.2. The **Group admin audience** is the Group approvers. The **Game admin audience** is Organizers ∪ Group approvers after the edge-case exclusions. Finished Game adds a third, the **player audience**.

| Event | Audience | Excluded |
| --- | --- | --- |
| Group joined | Group admin audience of that Group | the joiner; on approval, also the approver who decided |
| Game joined | Game admin audience of that Game | every User in the admitted party (the User, both Users of a pair, both Team members) |
| Game left | Game admin audience of that Game | the leaver |
| Game finished | Game admin audience ∪ player audience, one row each, admin wins | nobody (a system event with no actor) |

Audiences are resolved when the event happens and are not recalculated later. Someone who joins an audience afterwards does not get older Notifications. Someone who leaves one keeps the Notifications they already have. Opening one may then land on a refused page, which is acceptable.

**D2. One row per recipient, written in the event's transaction.** Fan-out happens on write. Audiences are small: a Group creator, a Community's Owners and Admins, and at most a tournament's players. Read state belongs to each recipient. A failed event leaves no Notification, and a written Notification always describes something that committed. Doors that write occupancy without a transaction today (`joinLoosePublic`, `joinClubPublic`, `register`) wrap the membership write and the Notification write in one transaction.

**D3. One shared emit module.** `packages/api/src/notifications/` is a shared server module, like Soft-archive and Game admit, because many doors call it. It is not a service layer. Procedures and shared modules call it next to the write they already make. The Game-joined emit lives **inside `admit()`**, so every Game admit door, promotion included, notifies without changes at each door. The Group-joined emit is called at the five insert sites in 2.2.

**D4. Finished Game.** A Game is finished when it is not cancelled, is not an Americano, has at least one Match, every Match is `completed` or `cancelled`, and at least one is `completed`. A Game whose Matches are all cancelled counts as cancelled, not finished (Q-A). It is checked after each Match settlement, in the same transaction. It notifies once per Game, ever: a later reversal followed by a new finish does not notify again.

**D5. Deduplication.** Join and leave events are separate facts. A join, then a leave, then a join again writes three rows, with no collapsing. Within one event, `notify()` writes at most one row per recipient across all audiences. Finished Game also carries a `dedupe_key` of `game_finished:{gameId}`. A unique index on `(recipient_user_id, dedupe_key)` with `ON CONFLICT DO NOTHING` makes it idempotent across repeated finishes.

**D6. Freshness by polling.** The Web App polls `notifications.unreadCount` every 60 s while the tab is visible, and again on window focus. The list is fetched when the Notifications page opens. No push channel. Each poll is one indexed count per active tab, and it is stateless, so it works across Railway instances and through the Next rewrite unchanged. See the ADR in 8.2.

**D7. Retention.** 90 days. List and count procedures ignore older rows. `notify()` deletes its recipients' rows older than 90 days in the same write, so no scheduler is needed.

**D8. Copy is rendered on the client from structured rows.** Rows store ids, type and audience, not text. Names come from joins at read time, so a renamed Group or User shows the current name. Copy lives in a new pure `@repo/domain/notification-copy` module, so the Mobile App can reuse it. Route strings stay in the Web App, because `@repo/domain` must not hold web routes.

**D9. Read semantics (decision 7).** Opening the Notifications page does not mark everything read. Clicking a row marks that row read, then navigates. "Mark all as read" marks every unread row created at or before the newest row the client has loaded, so a Notification that arrives in the meantime stays unread.

**D10. One bell, two kinds of inbox items.** The bell opens `/dashboard/notifications`. Its top row reads "N invites waiting", links to the existing `/dashboard/invites`, and shows only when N > 0. The Notifications list follows. The bell's dot shows when there are unread Notifications **or** pending invites.

## 6. Audiences and edge cases

### 6.1 Definitions

- **Group admin audience** of Group G = `groupApproverUserIds(G)`. It is exactly the set for which `isGroupApprover` is true. Loose Group: the creator. Club Group: empty if the Community is Soft-archived; otherwise Community Owners and Admins, plus the Group creator if they still hold a Community seat.
- **Game admin audience** of Game X = (Organizers of X ∪ Group approvers of X's Group), minus the exclusions in 6.2, de-duplicated.
- **Player audience** of Game X = the `user_id` of every `game_players` row on X at finish time.

On a Group Game, the Game admin audience **reduces to the Group admin audience of the Game's Group**. Organizers are the Group creator plus Community staff. Group approvers are the same set with the two edge-case filters already applied. So the union minus the exclusions equals `groupApproverUserIds`. On a groupless Game it is `[games.created_by]`. The implementation resolves it that way (7.2). A parity test asserts the reduction against the union of the two predicates minus the exclusions, so a future change to either rule breaks the test, not production.

### 6.2 Edge cases and how each is handled

| # | Edge case | Handling | Covered by |
| --- | --- | --- | --- |
| E1 | **Club Group creator who left the Community.** Still an Organizer per `mayOrganizeGroupGames`, but not a Group approver. | Not in either admin audience for that Club Group: no Group-joined, Game-joined, Game-left or admin Finished Game Notifications. If they still hold a `game_players` row on a Game in that Group when it finishes, they get the **player** Finished Game notice like any player (decision Q-B). | resolver parity test, recipient tests on all four events |
| E2 | **Soft-archived Community.** Organizers still resolve per `isGameOrganizer`; joins are refused but leave and Match settlement still work. | **No Notifications at all** for that Community's Club Groups and their Games, for admins and players alike. The admin audiences resolve to empty (approvers are nobody while archived), and `notify()` callers on Game events skip the write when `consult(... clubGroupGame ...)` freezes `host`. Unarchiving does not backfill. | tests: leave, force-complete and last-Match-settle in an archived Community write nothing |
| E3 | **Game creator who lost Organizer status** (demoted Admin, or left the Community). | Not notified as an admin (decision 4). Notified as a player only if still registered at finish. | recipient test |
| E4 | **Community Admin demoted to Member, or promoted to Admin.** | The audience is read at event time: a demoted Admin stops receiving, a promoted Member starts. Earlier rows stay where they are. | recipient test on both directions |
| E5 | **A User in several roles at once** (Owner and Group creator, admin and player). | One row per recipient per event. On Finished Game, admin beats player: one row with `audience = admin`. | `notify` unit test, Finished Game test |
| E6 | **The actor is an admin.** An Organizer registers themselves, or leaves, or an approver's own join. | Excluded as actor. For pair and Team joins, every party User is excluded, so an admin seated as a partner by someone else is not told about it either (accepted; they are in the party). | per-door tests |
| E7 | **Approval by the only approver.** | The joiner and the deciding approver are both excluded, so nothing is written. | Group-joined test |
| E8 | **Waitlist promotion triggered by a leave or a kick.** | The promoted User is the actor of `game_player_joined`, with `via_waitlist`. The leaver, or the kicking Organizer, is not the actor of that join. If they are in the admin audience they receive it, which tells the kicker who took the seat. | promotion tests (leave and kick) |
| E9 | **Partner-required leave** removes the partner too. | One `game_player_left` row per admin naming the leaver, with `partner_user_id` set to the partner who was removed. No separate row for the partner. | leave test |
| E10 | **Groupless (legacy) Game.** | Game admin audience = `[games.created_by]`. There are no Group approvers. Players are handled as usual. | resolver test |
| E11 | **Loose Group.** | Organizer, approver and creator are the same person: a single recipient. | resolver test |
| E12 | **Finished then un-finished** (wrong-score reversal, or `addMatch` on a Groups only tournament), then finished again. | No second Finished Game row (dedupe key). | Finished Game test |
| E13 | **Every Match cancelled, none completed** (for example every Pool Match voided). | Treated as a cancelled Game (decision Q-A): not finished, no Notification. | Finished Game test |
| E14 | **Cancelled Game**, including cancelling a Friendly game's only Match. | Never finished, never notifies. An all-cancelled Game (E13) is handled the same way. | Finished Game test |
| E15 | **Americano.** | Never finishes (deferred, decision 2). | Finished Game test |
| E16 | **Players who left, were kicked, or are waitlisted at finish.** | Not players: no `game_players` row. A kicked drawn-tournament Game team's Users are gone from `game_players` too. | Finished Game test |
| E17 | **The User who settled the last Match** (a player who confirmed, or an Organizer who force-completed). | Still notified, because Finished Game has no actor (decision 10). | Finished Game test |
| E18 | **Recipient later loses access** (removed from Community, demoted). | Keeps the row. The link may open a refused page. | none (accepted) |
| E19 | **Group deleted** (`routers/groups/delete.ts`). | Its rows cascade away. Games are never deleted. | schema FK |
| E20 | **Venue Soft-archived.** | No effect on Notifications; only Community Soft-archive suppresses them. | none |

## 7. Domain model and server design

### 7.1 Schema (`@repo/db`)

A new file `packages/db/src/schema/notifications.ts`, exported from `schema/index.ts`. One new migration from `pnpm exec turbo run db:generate`. Existing migrations are never edited.

```text
notification_type      enum: group_member_joined | game_player_joined | game_player_left | game_finished
notification_audience  enum: admin | player

notifications
  id                 uuid pk default random
  recipient_user_id  uuid not null  -> user.id    on delete cascade
  type               notification_type not null
  audience           notification_audience not null default 'admin'  -- which copy the recipient sees
  actor_user_id      uuid null      -> user.id    on delete set null   -- who did it; null for game_finished
  partner_user_id    uuid null      -> user.id    on delete set null   -- the second User of a pair join, or the partner removed with a leaver
  team_id            uuid null      -> teams.id   on delete set null   -- set when a complete Team joined
  group_id           uuid null      -> groups.id  on delete cascade
  game_id            uuid null      -> games.id   on delete cascade
  via_waitlist       boolean not null default false                    -- the join came from Waitlist promotion
  dedupe_key         varchar(255) null
  read_at            timestamp null
  created_at         timestamp not null default now()

indexes
  notifications_recipient_created_idx  (recipient_user_id, created_at desc, id desc)        -- list, cursor
  notifications_recipient_unread_idx   (recipient_user_id) where read_at is null           -- unreadCount
  notifications_recipient_dedupe_uq    unique (recipient_user_id, dedupe_key)              -- nulls distinct, so only keyed rows collide
```

`group_id` is set on every type: the Group itself for `group_member_joined`, and the Game's Group for Game types (null on a groupless Game). `game_id` is set on the three Game types. `audience` is `player` only on `game_finished`. The design uses nullable typed columns, not a `jsonb` payload. That matches the rest of the schema, which has no `jsonb`, and keeps reads typed. A future type adds nullable columns and enum values, both additive.

### 7.2 Audience resolvers (beside the existing predicates)

- `groupApproverUserIds(database, group): Promise<string[]>` in `packages/api/src/groups/helpers/is-group-approver.ts`, next to `isGroupApprover`. Loose: `[group.createdBy]`. Club: `[]` if the Community is Soft-archived. Otherwise Owners and Admins, plus `created_by` if they still hold a Community seat. Duplicates removed.
- `gameAdminUserIds(database, game): Promise<string[]>` in `packages/api/src/games/access.ts`, next to `isGameOrganizer`. Groupless: `[game.createdBy]`. Group Game: `groupApproverUserIds(group)` (6.1). The one place that defines the Game admin audience.
- `gamePlayerUserIds(database, gameId): Promise<string[]>`, in `packages/api/src/notifications/notify-game-finished.ts`, because it is that file's only caller. Distinct `game_players.user_id` for the Game.
- Parity tests across fixtures (Loose Group, Club Group, groupless Game, Soft-archived Community, a creator who left, a demoted Admin, an Owner who is also the creator):
  - A User is in `groupApproverUserIds` exactly when `isGroupApprover` is true.
  - A User is in `gameAdminUserIds` exactly when (`isGameOrganizer` or `isGroupApprover`) is true **and** neither E1 nor E2 applies.

### 7.3 Emit module (`packages/api/src/notifications/`)

- `notify.ts` exports `notify(tx, { type, recipients: { userId, audience }[], excludeUserIds, actorUserId?, partnerUserId?, teamId?, groupId?, gameId?, viaWaitlist?, dedupeKey? })`. It removes excluded ids, collapses duplicates (admin wins over player), returns early when nothing is left, and bulk-inserts one row per recipient (`ON CONFLICT DO NOTHING` when `dedupeKey` is set). It then deletes those recipients' rows older than the retention window. The only module that inserts into `notifications`.
- `game-notifications-suppressed.ts` exports `gameNotificationsSuppressed(tx, game)`, true when the Game's Club Group Community is Soft-archived (E2). Called by every Game emit. Group-joined needs no check, because the approver set is already empty when archived.
- `notify-group-joined.ts` exports `notifyGroupJoined(tx, { group, joinerUserId, decidedByUserId? })`.
- `notify-game-finished.ts` exports `notifyIfGameFinished(tx, game)`. It applies the D4 rule through a pure predicate, `isGameFinishedByResults`, kept in the same file unless a client needs it. If the Game is finished and not suppressed, it notifies the admin audience as `admin` and the player audience as `player`, with the dedupe key.
- Game joined and Game left call `notify` directly with `gameAdminUserIds`, after the suppression check. The joined emit sits inside `admit()`; the left emit sits in `routers/games/leave.ts`. Each has only one caller, so neither gets a wrapper file.

Placement in Game admit (`games/admit.ts`, on each `ok: true` return): `admitUser` sets actor = the User. `admitPair` sets actor = `userIds[0]` and partner = `userIds[1]`. `admitTeam` sets actor = the first Team member, partner = the second, and `team_id`. All party Users are excluded. `via_waitlist = (door === "promote")`.

Placement on leave (`routers/games/leave.ts`): before `leaveRegisteredSeat` runs, read the leaver's Game team occupants. If the Game is partner-required and the draw is not posted, set `partner_user_id` to the other occupant, who is removed with the leaver. Emit after the leave in the same transaction. Waitlist promotion inside `leaveRegisteredSeat` writes its own `game_player_joined` row through `admit()`.

Placement for finished: call `notifyIfGameFinished(tx, game)` at the end of the settling transaction in:

- `games/run-match-completion-effect.ts`
- `routers/games/completeMatch.ts`
- `routers/games/cancelMatch.ts`: the Pool void and Knockout Walkover branches only, not the Friendly-game branch that cancels the Game
- `routers/games/kick.ts`: only when it cancelled Pool Matches

### 7.4 Procedures (new `notifications` router, additive)

All are `protectedProcedure`, scoped to the caller's own rows through `resolveAppUser`. Files live in `packages/api/src/routers/notifications/`, one per procedure, composed in `index.ts` and mounted in `packages/api/src/root.ts` as `notifications`. Each exports a db-taking plain function for PGlite tests.

| Procedure | Kind | Input | Output |
| --- | --- | --- | --- |
| `notifications.list` | query | `{ cursor?: { createdAt: Date, id: uuid }, limit?: 1..50 = 20 }` | `{ items: NotificationItem[], nextCursor }` |
| `notifications.unreadCount` | query | none | `{ count: number }` |
| `notifications.markRead` | mutation | `{ ids: uuid[] (1..100) }` | `{ updated: number }`; other Users' ids are silently ignored |
| `notifications.markAllRead` | mutation | `{ upTo: Date }` | `{ updated: number }` |

`NotificationItem` = `{ id, type, audience, createdAt, readAt, viaWaitlist, actor: { id, name, image } | null, partner: same | null, team: { id, name } | null, group: { id, name } | null, game: { id, name, format, windowStart } | null }`. Only rows inside the retention window. Clients must ignore a `type` or `audience` they do not recognise. That keeps future values additive for released Mobile App builds.

### 7.5 Web App

- `apps/web/src/components/notifications/notification-bell.tsx`: a link to `/dashboard/notifications` with the unread dot. It polls `unreadCount` with `refetchInterval: 60_000` and `refetchOnWindowFocus: true`, and also reads the four pending-invite counts already used by Home. `HomeHeader` swaps its inline bell for this component. It is also added to `AppRail` for `lg` and up.
- `apps/web/src/app/dashboard/notifications/page.tsx`: `DashboardShell` titled "Notifications". The invites row comes first when N > 0. Then an infinite list (`useInfiniteQuery` over `notifications.list`) using `RowList` / `ListRow` and `UserAvatar`. Unread rows are marked by an ink dot and semibold text, not by colour. Includes a "Mark all as read" action and an empty state through `EmptyState`.
- Row click: `markRead`, then go to `/dashboard/groups/{id}` or `/dashboard/games/{id}`. The route mapping lives in `apps/web/src/lib/`, not in `@repo/domain`. Invalidate `unreadCount` and `list` after either mutation.
- `apps/web/src/lib/dashboard-paths.ts`: give `/dashboard/notifications` a back target, like `/dashboard/invites`.

### 7.6 Copy (`@repo/domain/notification-copy`; approved, decision 9)

A missing Game name falls back to the format label and day, for example "Friendly game · Thu 9 Oct" (`gameFormatLabel`, `formatDayMonth`). A deleted actor shows as "Someone".

| Type | Audience | Title | Variant or subline |
| --- | --- | --- | --- |
| `group_member_joined` | admin | **{actor}** joined **{group}** | none |
| `game_player_joined` | admin | **{actor}** joined **{game}** | pair: **{actor}** and **{partner}** joined **{game}**. Team: **{team}** joined **{game}**. Waitlist: **{actor}** came off the Waitlist into **{game}** |
| `game_player_left` | admin | **{actor}** left **{game}** | with a partner removed: **{actor}** left **{game}**. **{partner}** was removed with them |
| `game_finished` | admin | **{game}** has finished | "Every Match is in." |
| `game_finished` | player | **{game}** has finished | "See your results." |

Meta line: relative time ("2 min ago", "Yesterday") in the product timezone, plus the Group name for Game types.

## 8. Domain docs

### 8.1 Glossary additions for `CONTEXT.md` (apply in ticket 1)

> **Notification**:
> An in-app record that tells one User that something happened on a Group or Game they run, or that a Game they played on has finished. One row per recipient, unread until that User opens it or marks all read. Kept 90 days. Never sent for a Soft-archived Community. Not a push message, not an email, not an invite.
> _Avoid_: alert, activity, feed item, message, Lookup invite (that is an actionable invitation)

> **Game admins**:
> Who hears about a Game's joins and leaves, and gets the admin Finished Game notice: the Organizers and the Group approvers of the Game's Group, except a Club Group creator who has left the Community, and nobody while the Community is Soft-archived. On a groupless Game, its creator. Decides who is notified only, never who may act.
> _Avoid_: Organizer (that is the write permission), game admin (lowercase, as a role), co-host, host

> **Notifications page**:
> The Web App page at `/dashboard/notifications`, opened from the bell, listing the signed-in User's Notifications newest first, with a link to pending invites when there are any.
> _Avoid_: feed, inbox (when you mean this page), activity log, Home

> **Finished Game**:
> A Game that is not cancelled and whose Matches are all completed or cancelled, with at least one completed. Derived, not stored. An Americano, which has no Matches, is never a Finished Game.
> _Avoid_: completed Game (completed is a Match status), ended, over, past Game

Also add "game admin" and "co-host" to the _Avoid_ list of **Organizer**, and "group admin" to that of **Group approver**.

### 8.2 ADR proposal: `docs/adr/0022-in-app-notifications-are-fan-out-rows-polled-by-clients.md`

> **In-app Notifications are fan-out rows written in the event's transaction, and clients poll for them**
>
> Game admins and Group approvers need to hear about joins, leaves and finished Games, and players need to hear that their Game finished. We store one `notifications` row per recipient, written in the same transaction as the event by one shared module (`packages/api/src/notifications`). Audiences are resolved at write time. The Game admin audience is the union of the Organizer and Group approver rules, minus a Club Group creator who has left the Community, and empty while the Community is Soft-archived. These exclusions decide who is notified, never who may act. Clients poll an unread count, every 60 s on web while visible, and fetch the list on demand.
>
> **Considered options.** (1) Fan-out on read: compute a User's feed from Groups and Games they run. Rejected: needs per-type queries over many tables on every poll, and has no natural home for per-User read state. (2) An outbox table plus a worker that fans out after commit. Rejected for now: no job runner exists, and audiences are small. (3) SSE or WebSocket from Hono. Rejected for now: the Next rewrite and several Railway instances would need Postgres LISTEN/NOTIFY or a broker, and the product needs only about one minute of freshness. (4) Notify every current Organizer as `isGameOrganizer` defines them. Rejected: it notifies Club Group creators who left the Community and runs during Soft-archive. (5) Time-based Finished Game via a scheduler. Deferred, together with Americano.
>
> **Consequences.** A Notification exists only if its event committed. Phase 7 push can read the same rows after commit, or hang off `notify()`, without changing the procedures. Changing roles does not move existing Notifications. Moving to real-time later replaces polling on the client only.

## 9. Testing

Follow the existing seams. Procedures are tested through their exported plain functions against PGlite (`@repo/db/testing`). Shared modules are tested directly. Every edge case in 6.2 that names a test is covered.

- `notify`: excludes actors, collapses duplicates with admin beating player, writes nothing for an empty set, dedupe key is idempotent, retention purge removes only that recipient's old rows.
- Resolvers: the parity tests in 7.2, plus E10 and E11.
- `gameNotificationsSuppressed`: true only for a Club Group Game in a Soft-archived Community.
- Group joined: the five doors in 2.2. Group create writes nothing. E7.
- Game joined: user, pair, team, Invite door, promotion after a leave and after a kick (`via_waitlist`, E8). E1, E2 (a promotion in an archived Community writes nothing), E6. Joining the Waitlist writes nothing.
- Game left: plain leave, partner-required leave with a partner (E9), E1, E2, E6. Kick writes no `game_player_left`. `leaveWaitlist` writes nothing.
- Game finished:
  - Settling paths: Friendly game confirmation and force-complete, Groups only tournament (last Pool Match completed, last Pool Match voided), Knockout Final and Final Walkover.
  - Audience: admins get `admin`; registered players, Partner registration partners and Team members get `player`; a User who is both gets one `admin` row (E5).
  - Who is excluded: waitlisted, left and kicked Users get nothing (E16), and the last settler is included (E17).
  - Suppression: E1 (a creator who left gets only the player row if still registered), E2 (archived: nothing).
  - Rule boundaries: E12, E13, E14, E15.
- Procedures: `list` pagination and ordering, retention cut-off, only own rows, `audience` returned. `markRead` ignores other Users' ids. `markAllRead` leaves rows newer than `upTo` unread. `unreadCount` matches.
- Domain: `notification-copy` unit tests for every type, audience, variant and fallback.
- Web: unit test for the route mapping. Manual check on `pnpm dev:web` that the bell dot appears within 60 s of a join made in another browser.

## 10. Risks

- **Transaction scope creep.** Wrapping `joinLoosePublic`, `joinClubPublic` and `register` in transactions changes their failure behaviour slightly: a failed Notification insert now rolls back the join. Accepted. A Notification bug fails loudly in tests rather than half-writing.
- **Emit inside `admit()`.** Game admit is a shared glossary module, and adding a side effect touches every door. Mitigation: one emit at the success returns, with a test per door. The emit must not change `AdmitResult`.
- **Notification audience drifting from permissions.** The Game admin audience intentionally differs from `isGameOrganizer` (E1, E2). Mitigation: `gameAdminUserIds` is the single definition, the parity test pins the relationship, and the glossary and ADR state that the audience decides notification only.
- **Fan-out size.** A tournament's players plus a Community's staff on Finished Game: tens of rows in one bulk insert. Fine at today's sizes.
- **Spam from join/leave churn.** No collapsing in v1 (D5). Watch for it after launch.
- **Polling cost.** 1 request per minute per visible tab. Negligible today. If it grows, raise the interval or move to SSE (ADR consequences).
- **Mobile compatibility.** New `type` and `audience` values must stay additive, and clients must ignore unknown values. This is stated in the procedure contract (7.4), and the Mobile App must honour it when it adopts these procedures.

## 11. Open questions

None. All answered on 2026-10-07 (section 5.1).

## 12. Domain doc changes shipping with this spec

- `CONTEXT.md`: the four terms and the _Avoid_ additions in 8.1. Not applied yet; ticket 1 applies them.
- `docs/adr/0022-in-app-notifications-are-fan-out-rows-polled-by-clients.md`: text in 8.2. Not written yet; ticket 1 writes it.

## 13. Tickets (in Linear: TEM-345 … TEM-349)

Implement in order. 1 blocks the rest. 3 and 4 depend on 1 only. 5 depends on 3 for `gameAdminUserIds` and the suppression check. Each ticket is a vertical slice: schema or emit, procedure, UI, tests.

| # | Title | Blocked by |
| --- | --- | --- |
| 1 (TEM-345) | Group approvers get a Notification when someone joins their Group | none |
| 2 (TEM-346) | Bell with unread dot, mark read and mark all read | 1 |
| 3 (TEM-347) | Game admins get a Notification when someone joins their Game | 1 |
| 4 (TEM-348) | Game admins get a Notification when someone leaves their Game | 1, 3 |
| 5 (TEM-349) | Game admins and players get a Notification when their Game finishes | 1, 3 |

### Ticket 1 (TEM-345): Group approvers get a Notification when someone joins their Group

**What to build.**
- The Notification foundation: schema and migration with `audience` (7.1).
- The `notify` module with actor exclusion, duplicate collapse and retention purge (7.3).
- `groupApproverUserIds` beside `isGroupApprover`, with a parity test (7.2).
- `notifyGroupJoined` called at all five Group insert sites in 2.2, with `joinLoosePublic` and `joinClubPublic` wrapping insert and emit in one transaction.
- The `notifications` router with `list` and `unreadCount` (7.4), mounted in `root.ts`.
- `@repo/domain/notification-copy` for this type.
- A first `/dashboard/notifications` page that lists rows newest first and links each to its Group (7.5, without read state).
- The glossary (8.1) and ADR-0022 (8.2).

**Acceptance criteria.**
- Joining through the Group URL, a Club Group Public join, an approved Group join request, a Group Invite link, or a Group Lookup invite each writes one `group_member_joined` row per Group approver, in the same transaction as the membership row.
- The joiner never gets a row. On approval, the deciding approver does not either. When that approver is the only one, nothing is written (E7). Group create writes nothing.
- A Club Group creator who left the Community gets no row (E1). A Soft-archived Community writes nothing (E2).
- The parity test passes for Loose Group, Club Group, Soft-archived Community and a creator who left.
- `notifications.list` returns only the caller's rows, newest first, cursor-paginated, within 90 days, with actor and Group names joined at read time.
- `notifications.unreadCount` returns the caller's unread count within 90 days.
- The Notifications page shows "{actor} joined {group}" with relative time, and each row opens that Group.
- `CONTEXT.md` and `docs/adr/0022-…` are updated in the same pull request.
- `pnpm exec turbo run typecheck lint test` passes.

### Ticket 2 (TEM-346): Bell with unread dot, mark read and mark all read

**What to build.**
- `notifications.markRead` and `notifications.markAllRead` (7.4).
- The `NotificationBell` component with 60 s visible-tab polling, used in `HomeHeader` in place of the inline invites bell and added to `AppRail`. The dot covers unread Notifications or pending invites (D10).
- On the Notifications page: the invites row, unread styling, click marks a row read, "Mark all as read" with an `upTo` cursor, an empty state, and infinite scroll.
- A back target in `dashboard-paths.ts`.

**Acceptance criteria.**
- With an unread Notification or a pending invite, the bell shows the dot on Home (mobile layout) and in the rail (`lg` and up). With neither, no dot.
- A Notification created in another session shows the dot within 60 s on a visible tab, with no reload. A hidden tab does not poll.
- Opening the Notifications page does not mark anything read (decision 7). Clicking a row marks it read and navigates. Rows of other Users cannot be marked.
- "Mark all as read" clears every loaded unread row and leaves a row that arrived afterwards unread.
- Unread state uses ink and weight only, in line with the black-and-white design rules. No accent colour.
- The "N invites waiting" row appears only when N > 0 and opens `/dashboard/invites`, which is unchanged.

### Ticket 3 (TEM-347): Game admins get a Notification when someone joins their Game

**What to build.**
- `gameAdminUserIds` beside `isGameOrganizer`, with the union parity test (7.2).
- `gameNotificationsSuppressed` (7.3).
- A `game_player_joined` emit on each success path in `admit()` (`games/admit.ts`): user, pair (`partner_user_id`), team (`team_id`), and `via_waitlist` for the `promote` door.
- Wrap `register.ts`'s admit and Waitlist logic in a transaction.
- Copy variants and the Game-name fallback in `notification-copy`. Rows link to the Game.

**Acceptance criteria.**
- Each Game admit door in 2.3 writes one row per Game admin: Americano register, seat pick, Partner registration, complete Team, Game Lookup invite, Game Invite link, and Waitlist promotion after a leave or a kick (E8).
- No User in the admitted party gets a row (E6).
- On a Club Group Game, Community Owners and Admins and the Group creator who is still a Member each get exactly one row. A creator who left the Community gets none (E1). A demoted Admin gets none, and a newly promoted Admin gets one (E4). On a groupless Game, only the creator (E10).
- A Club Group Game in a Soft-archived Community writes nothing, including a promotion (E2).
- Joining the Waitlist (decision 11), re-seating an already-registered User, and `mergeHalfTeams` write nothing.
- `AdmitResult` and every door's response are unchanged.
- Copy matches the table in 7.6 for user, pair, Team and Waitlist promotion, and for a Game with no name.

### Ticket 4 (TEM-348): Game admins get a Notification when someone leaves their Game

**What to build.**
- A `game_player_left` emit in `routers/games/leave.ts`, inside the existing transaction, using `gameAdminUserIds` and the suppression check.
- Before the leave, capture the partner who is removed with the leaver on a partner-required tournament before the draw.
- Copy variants.

**Acceptance criteria.**
- `games.leave` writes one row per Game admin, excluding the leaver (E6).
- On a Friendly tournament that does not allow registering alone, before the Pool draw, the single row names the removed partner (E9).
- A creator who left the Community gets no row (E1). A leave in a Soft-archived Community writes nothing (E2).
- `games.kick` and `games.leaveWaitlist` write no `game_player_left` rows.
- The Waitlist promotion that follows a leave writes its own `game_player_joined` row.

### Ticket 5 (TEM-349): Game admins and players get a Notification when their Game finishes

**What to build.**
- `notifyIfGameFinished` with the D4 rule, the player audience from `game_players`, admin-over-player collapse, the suppression check, and the `game_finished:{gameId}` dedupe key.
- Call it at the end of the settling transaction in `games/run-match-completion-effect.ts`, `routers/games/completeMatch.ts`, `routers/games/cancelMatch.ts` (Pool void and Knockout Walkover branches only) and `routers/games/kick.ts` (after it cancels Pool Matches).
- Admin and player copy.

**Acceptance criteria.**
- A Friendly game whose Match completes, by full confirmation or by Organizer force-complete, notifies once:
  - every Game admin, with `audience = admin`
  - every registered player, including Partner registration partners and Team members, with `audience = player`
- A Groups only tournament notifies when its last Pool Match is completed or voided, as long as at least one Match is completed. A tournament with a Knockout notifies when the Final is completed or settled as a Walkover.
- A User who is both a Game admin and a player gets exactly one row, with admin copy (E5).
- Waitlisted Users, and Users who left or were kicked before the finish, get nothing (E16).
- The User who settled the last Match also gets it (E17, decision 10).
- A Club Group creator who left the Community gets no admin row. They get a player row only if still registered (E1, decision Q-B).
- A Soft-archived Community writes nothing for admins or players (E2).
- A cancelled Game, a Game whose Matches are all cancelled (treated as cancelled, decision Q-A), a Game with no Matches, and an Americano never notify (E13, E14, E15).
- A wrong-score reversal followed by a new completion, or an added Match followed by a new completion, does not notify again (E12).

## Comments

- 2026-10-07: The user answered Q1–Q6 and Q8, recorded in 5.1. Q3 changed the admin audience to Organizers ∪ Group approvers with E1 and E2 handled. Q5 added the player audience and the `audience` column. Ticket 5 now depends on ticket 3, and ticket 4 on ticket 3 as well.
- 2026-10-07: The user answered Q-A, Q-B, Q7, Q9, Q10 and Q11, all confirming the defaults. Moved to 5.1; spec approved for implementation.
- 2026-10-07: Tickets published to Linear as TEM-345 … TEM-349 with native blocking relations.
