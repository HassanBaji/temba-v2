Status: ready-for-agent

## Problem Statement

Games can be public (Games hub Public tab) or groupless, and Groups cannot be discovered at all: a Loose Group Public is joinable only by someone who already has its URL, and the glossary says Groups are never listed. For now, the product wants play to happen inside Groups. Public pickup Games should not be shown, every new Game should belong to a Group, and Users need a way to find Public Groups and ask to join them. A Group owner also needs to be able to say "anyone may find this Group, but I approve who gets in."

## Solution

1. **Hide public Games.** The Games hub loses its Public tab and the "Find a public game" action. Data and the `games.listPublicPickup` procedure stay; this is a reversible UI hide.
2. **Every new Game belongs to a Group.** `games.create` requires `groupId`. Create Game gets a required Group field listing the Groups where the User may create a Game. Existing groupless Games are left untouched.
3. **Require approval.** Every Public Group (Loose or Club) gets a **Require approval** flag, set at create and editable later by a Group approver. When it is on, the Group URL join door becomes a **Group join request** that a Group approver approves or rejects on Group home.
4. **Public Groups list.** The Groups page gets a Public tab listing every live Public Group the User is not in: Loose Group Public, and Club Group Public in live Communities (Public or Private). Each row offers Join or Request to join.
5. **One request covers both.** A User who is not a Member of a Club Group's Community can still request that Group. On approval they become a Community Member and a Group member together. This is always a request, even when Require approval is off, and it is also how Users enter a Community Private through one of its Public Groups.

Lookup invites and Invite links still admit directly and never go through approval.

## Glossary changes (CONTEXT.md)

- New: **Public Groups list**, **Require approval**, **Group join request**, **Group approver**.
- **Directory**: no longer "Groups are never in the Directory". The Public Groups list is a separate surface, and the Directory stays a planned Community list.
- **Loose Group Public**: now listed on the Public Groups list. The Group URL admits directly unless Require approval is on.
- **Club Group Public**: listed. A non-Member may send a Group join request, and approving it also creates the Community membership.
- **Community Private**: an approved Group join request on one of its Club Group Public is a new way in.
- **Game**: new Games must belong to a Group. Groupless Games are legacy rows.

TEM-226 writes the new glossary terms. TEM-228 applies the Directory, Loose Group Public, Club Group Public, and Community Private edits, and adds ADR-0014 recording the decision to list Groups and to let a Group join request create Community membership. TEM-225 applies the Game edit.

## User Stories

### Hide public Games

1. As a User on the Games hub, I want only My Games and History tabs, so that no Public pickup list is shown.
2. As a User with no Games, I want the empty state to offer Create Game (when I have create access) and no "Find a public game" button.
3. As a User opening `/dashboard/games?tab=public`, I want to land on My Games, so that old links do not open a hidden tab.
4. As a User on a legacy public Game I already joined, I want Game home to keep working as today.

### Every new Game belongs to a Group

5. As an organizer on Create Game, I want a required Group field listing the Groups where I may create a Game, so that every new Game has a Group.
6. As an organizer opening Create Game from Group home (`?groupId=`), I want that Group preselected.
7. As an organizer, I want the Venue field disabled until a Group is picked, because the Venue rules depend on the Group (a linked Venue locks the choice).
8. As an organizer who changes the Group, I want Venue and Court to reset, so that I cannot submit a Venue left over from another Group.
9. As an organizer with no Group where I may create a Game, I want an empty state explaining that Games are created inside a Group, with Create Group when I have create access.
10. As a crafted client, I want `games.create` without `groupId` refused, so that the rule does not depend on the UI.
11. As a User who created or joined a groupless Game before this change, I want it to keep working (view, register, invites, scoring, history).
12. Groups inside a Soft-archived Community are not offered in the Group field, and the server still refuses them as it does today.

### Require approval

13. As a User creating a Public Group, I want a Require approval switch (default off), so that I decide whether people can join directly.
14. As a User creating a Private Group, I want no Require approval switch, because Private Groups have no open join door.
15. As Community Owner or Admin creating a Club Group Public, I want the same switch.
16. As a Group approver on Group home, I want to turn Require approval on or off for a Public Group.
17. As a non-approver, I want no control for the flag, and a crafted call is refused.
18. As a User on a Public Group home with Require approval on, I want Request to join instead of Join. After I send it, I want to see Requested.
19. As a User with a rejected request, I want Request to join available again (same rule as a Community join request).
20. As a crafted client, I want `joinLoosePublic` and `joinClubPublic` refused while Require approval is on.
21. As a Group approver, I want a Requests section on Group home listing pending Group join requests (name, avatar, requested time) with Approve and Reject.
22. As a Group approver who approves, I want the requester to become a Group member at once.
23. As a Group approver who rejects, I want the request marked rejected and the requester not admitted.
24. As a Group approver who turns Require approval off, I want pending requests to stay pending until someone decides them. Turning the flag off admits nobody automatically.
25. As a requester who joins through a Lookup invite or Invite link while a request is pending, I want that request marked approved, so that approvers do not see a stale row.
26. As a Group member who leaves, I want to be able to request again later.
27. As anyone, I want request, approve, and reject refused while the Club Group's Community is Soft-archived.

### Club Group requests from non-Members

28. As a User who is not a Member of a Club Group Public's Community, I want Request to join on Group home and on the list, even when Require approval is off.
29. As a Group approver, I want the Requests row to show "Not yet a {Community} Member", so that I know approving also admits them to the Community.
30. As a Group approver who approves that request, I want the User added as Community Member and Group member in one transaction.
31. As a requester who also had a pending Community join request, I want that request marked approved when my Group join request is approved.
32. As a requester who became a Community Member before the decision, I want approval to add only the Group membership.
33. As a Community Private, I want its Club Group Public joinable only by an approved Group join request. There is still no request-to-join on the Community itself.

### Public Groups list

34. As a User on Groups, I want tabs **Mine** and **Public** (`?tab=public`), so that I can browse Groups to join.
35. As a User on Public, I want every live Public padel Group I am not a member of: Loose Group Public, and Club Group Public in non-archived Communities (Public or Private).
36. As a User, I want Groups I already belong to excluded, because they are on Mine.
37. As a User, I want each row to show Group name, the Community name (Club Groups only), member count, and a "Requires approval" marker when the Group needs approval.
38. As a User, I want each row's action to be Join, Request to join, or Requested, based on the server's join mode for me.
39. As a User, I want Join to admit me and move the Group to Mine, and Request to join to switch the row to Requested.
40. As a User, I want tapping a row to open Group home.
41. As a User with nothing to browse, I want an empty state: "No public Groups to join right now."
42. As a User creating a Public Group, I want it to appear on other Users' Public tab immediately.
43. The Public tab is visible to every authenticated User and is not gated by `groupCreator`.

## Implementation Decisions

### Data (DB Package, one migration)

- `groups.requires_approval boolean not null default false`. Only meaningful when `type = public`. Private Groups always keep `false`.
- New table `group_join_requests`, modeled on `community_join_requests`: `id`, `group_id` (fk groups, cascade), `user_id` (fk user, cascade), `status` (`group_join_request_status` enum: pending / approved / rejected), `decided_by` (fk user, set null), `created_at`, `updated_at`, and a unique constraint on (`group_id`, `user_id`). A re-request reuses the row and resets it to pending, as `communities.requestJoin` does.

### Group approver (shared rule)

- Loose Group: the Group creator.
- Club Group: Community Owner or Admin, and the Group creator while they are still a Community Member.
- This matches `mayOrganizeGroupGames` / `canManageLookupInvites`. Put it in one shared helper under `server/groups/helpers/`, because it is used by several endpoints (decide, list requests, set flag, byId). Soft-archived Community → no one is an approver for writes.

### Join mode (shared rule)

A shared helper computes the viewer's join mode for a Group: `member | join | request | requested | none`.

- Private Group → `none`. Invites are the only way in.
- Loose Group Public: `request` if Require approval is on, otherwise `join`. `requested` when a pending request exists.
- Club Group Public in a live Community: `join` when the viewer is a Community Member and Require approval is off. `request` when the viewer is not a Member, or when Require approval is on. `requested` when a pending request exists.
- Club Group in a Soft-archived Community → `none`.

`groups.byId` returns `joinMode` (keep `canJoin*` for now, derived from it) and `canDecideJoinRequests` / `canSetRequiresApproval`. `groups.listPublic` uses the same helper.

### Endpoints (one procedure per file, `routers/groups/`)

- `createLoosePublic`, `createClubPublic`: optional `requiresApproval: boolean` (default false).
- `setRequiresApproval` (new): `{ groupId, requiresApproval }`. Public Groups only; approver only; refused when frozen.
- `requestJoin` (new): `{ groupId }`. Refused unless the join mode is `request`. Returns `requested` when a request is already pending (idempotent).
- `listJoinRequests` (new): pending requests for approvers. Each row includes `isCommunityMember` for Club Groups.
- `approveJoinRequest` / `rejectJoinRequest` (new): approver only, pending only. Approve runs in a transaction: insert `community_members` (role member) if the Group is a Club Group and the User is not a Member, then mark any pending `community_join_requests` row approved with `decided_by`, then insert `group_members` if missing, then mark the request approved.
- `joinLoosePublic`, `joinClubPublic`: refuse when `requires_approval` is on.
- `acceptLookupInvite`, `acceptInviteLink` (Group): after admitting, mark any pending Group join request approved.
- `listPublic` (new): the list in stories 35–38. Padel only (padel-only UI). Ordered by member count desc, then name. Capped at 100 rows (see Risks). Row: `id, name, sport, communityName | null, memberCount, requiresApproval, joinMode`.
- `games/create`: `groupId` becomes required. `createFriendlyGame` input requires `groupId`.
- `games/listCreateGroups` (new): Groups where `mayCreateGameOnGroup` is true and the Community (if any) is not Soft-archived. Row: `id, name, communityName | null`.

### UI

- `app/dashboard/games/page.tsx`: remove the Public tab, the `listPublicPickup` query, and "Find a public game". `lib/games-hub-tab.ts` maps `public` to `my-games`. Leave the other `listPublicPickup.invalidate()` calls. They are harmless and get cleaned up when the hide is reversed or made permanent.
- `app/dashboard/games/new/page.tsx`: Group select above Venue. `listCreateVenues` is enabled only once a Group is chosen. Update the description copy (drop "This Game has no Group").
- `app/dashboard/groups/new/page.tsx`: Require approval switch shown only when Type is Public. Update the description copy.
- Community home Create Club Group: the same switch when Public is chosen.
- `app/dashboard/groups/page.tsx`: tabs Mine / Public (same Tabs pattern as the Games hub). Mine keeps today's content (rows, Invitations, Start a group). Public renders `listPublic` rows.
- Group home: the Join CTA follows `joinMode` (Join / Request to join / Requested). Approvers get a Require approval switch (overflow menu or settings area) and a Requests section in the Members tab.

## Testing Decisions

### What a good test is

Behavior through tRPC procedures on PGlite (`~/server/test/pglite`, vitest), as in `groups/mine.test.ts` and `games/leave.test.ts`. Assert what the caller sees and what membership rows exist. Do not assert internal helper shapes.

### Test seams

- `games.create` without `groupId` is refused. With a Group where the caller may create a Game, it succeeds. `listCreateGroups` excludes Groups the caller may not organize and Groups in Soft-archived Communities.
- Loose Group Public without approval: `joinLoosePublic` admits. With approval on: `joinLoosePublic` is refused, `requestJoin` → pending, `approveJoinRequest` by the creator admits, and approval by a non-approver is refused.
- Reject, then re-request → pending again. Leave, then re-request → pending.
- `setRequiresApproval` is refused on Private Groups and for non-approvers. Turning it off leaves pending requests pending.
- Club Group Public, requester not a Community Member (Public and Private Community): approving creates both the Community membership (role member) and the Group membership. A pending Community join request becomes approved.
- Club Group Public, requester already a Member, approval off: `joinClubPublic` admits and `requestJoin` is refused.
- Soft-archived Community: request, approve, and reject are refused, and the Group is absent from `listPublic`.
- Invite link / Lookup accept marks a pending Group join request approved.
- `listPublic`: excludes the viewer's Groups, Private Groups, archived Communities, and football Groups. `joinMode` is correct per row.
- Games hub tab parse: `public` → `my-games` (`lib/games-hub-tab.test.ts`).

Manual check: Games hub without Public tab; Create Game with the Group picker from the hub and from Group home; Groups Public tab Join / Request; approver Requests section; legacy groupless Game still opens.

### Prior art

`communities/requestJoin.ts`, `approveJoinRequest.ts`, `rejectJoinRequest.ts`, `listJoinRequests.ts`, and the Community home request UI. `groups/mine.test.ts`.

## Out of Scope

- Deleting, migrating, or reassigning existing groupless or `isPublic` Games.
- Removing `games.isPublic`, `listPublicPickup`, or the groupless code paths in Game access.
- Search, filters, sport switcher, or pagination on the Public Groups list.
- Withdrawing a pending Group join request (Community join requests have no withdraw either).
- Notifications (push/email/in-app badge) for new requests or decisions.
- A request message, or request expiry.
- Changing a Group's type (Public ↔ Private).
- Listing Communities (Directory remains planned).
- Changing the Communities-hub `groupCreator` hide.

## Risks

- **Private Community exposure.** Listing Club Group Public from Community Private reveals Group and Community names to every User and opens a path into that Community. This was chosen deliberately. Staff who want a hidden club must keep its Groups Private.
- **Unbounded list.** A cap of 100 with no search is fine at current scale. Add search before it isn't.
- **Request spam.** Re-request after reject is allowed (same as Communities) and there is no rate limit.
- **Create Game regressions.** The Venue picker currently depends on an optional `groupId`. Check the locked-Venue path for a Club Group with a linked Venue.

## Implementation tickets (Linear)

1. [TEM-224 Hide public Games on the Games hub](https://linear.app/temba-app/issue/TEM-224). No blockers.
2. [TEM-225 Every new Game belongs to a Group](https://linear.app/temba-app/issue/TEM-225). No blockers.
3. [TEM-226 Require approval on Public Groups](https://linear.app/temba-app/issue/TEM-226). No blockers.
4. [TEM-227 Non-Members can request a Club Group Public](https://linear.app/temba-app/issue/TEM-227). Blocked by TEM-226.
5. [TEM-228 Public tab on Groups](https://linear.app/temba-app/issue/TEM-228). Blocked by TEM-226 and TEM-227.

## Comments
