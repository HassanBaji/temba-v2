Status: ready-for-agent

## Problem Statement

Padel partners need a durable **Team**: exactly two Users who can invite each other, optionally link that partnership to a Community with staff approval, and see partnership stats (games played, wins vs losses).

Today Temba has Communities and Groups, plus per-Game **Game teams** (sides). There is no persistent partnership entity. Group is explicitly not a Team. Stats on Groups are individual standing counters, not pair W–L. Game create/completion is not shipped in the App, so partnership results cannot yet be derived from live play.

## Solution

Add **Team** as a new product entity in the DB Package and App (schema, tRPC, dashboard UI, Email-invite accept URLs).

A Team is always created **unattached** (a Loose Team). The creator is the first member; they invite a partner (in-app or Email). When full, either member may request to **link** the Team to a Community (Public or Private). Owner or Admin approve; approve **auto-admits** any seat who is not yet a Community Member, then attaches the Team (a Club Team). Either member may **unlink** immediately. Leave Community is **refused** while the User sits on any Team linked to that Community.

Team home shows stored counters (games played, wins, losses, and related). Counters ship at zero; a later Game-completion slice updates them. This slice adds a nullable Team reference on `game_teams` so attribution is explicit when Games arrive.

Approving this spec approves the Test seams in Testing Decisions.

## User Stories

1. As an authenticated User, I want to create a Team with an optional name and no Community, so that I start an unattached partnership. The App stores padel as the sport. I become the sole member (incomplete Team). (tRPC still takes padel or football.)

2. As the creator of an incomplete Team, I want to send an in-app invite to an existing User for the open seat, so that my partner can join without email.

3. As the creator of an incomplete Team, I want to send an Email invite to any address (unknown OK) for the open seat, so that a partner without an account can join after Clerk sign-up when their email matches.

4. As the creator, I want at most one unused invite (in-app or Email) for the open seat, so that I am not managing parallel doors. Sending a new invite requires revoking the unused one first (or the product replaces it only after revoke).

5. As the creator, I want to revoke an unused Team invite, so that a wrong invite does not stay live.

6. As a User with a pending in-app Team invite addressed to me, I want to accept it and become the second member, so that the Team becomes full.

7. As a person with a Team Email invite URL, I want to sign in or sign up with Clerk and join the Team if my authenticated email matches (case-insensitive), so that Email invite behaves like Community/Group Email invites for seat fill only.

8. As a User whose email does not match the Team Email invite, I want accept to be refused without consuming the invite, so that a forwarded mail cannot attach the wrong person.

9. As a User accepting a Team Email invite, I want that accept to **never** make me a Community Member by itself, so that Community admit stays on Community doors or Team **link** approve.

10. As any User, I want creating a second Team with the same unordered partner pair to be refused once that pair is reserved (in-app pending invite to that User, or both members on a Team), so that global pair uniqueness holds.

11. As either member of a full Team, I want to request linking the Team to a Community I choose (Public or Private), so that the partnership can become a Club Team.

12. As the creator of an incomplete Team, I want link request to be refused, so that staff only review full partnerships.

13. As an Owner or Admin, I want to approve a pending Team link request, so that any seat who is not yet a Community Member is auto-admitted as Member and the Team attaches to that Community.

14. As an Owner or Admin, I want to reject a pending Team link request, so that the Team stays unattached and may request again later.

15. As a Member who is not Owner or Admin, I want approving or rejecting Team link requests to be refused.

16. As an Owner or Admin approving a link, I want approve to be refused if the Team’s sport is not on that Community’s sports allow-list (and the same check when the link is requested), so that Club Teams respect Community sports.

17. As a caller of remove Community sports tRPC, I want removing a sport to be refused while any **linked** Team of that sport exists in that Community (in addition to existing Club Group rules).

18. As either Team member, I want to unlink the Team from its Community immediately without staff, so that the Team becomes unattached again. Pending link requests for that Team are cancelled. Re-link later is allowed subject to Soft-archive and allow-list.

19. As a Community Member, I want leave Community to be refused while I sit on any Team linked to that Community, so that I must unlink or dissolve the Team first.

20. As either member of a full Team, I want to leave/dissolve the Team, so that the partnership ends, pending invites are revoked, counters are discarded with the Team, and the global pair is freed.

21. As the creator of an incomplete Team, I want to dissolve/cancel the Team, so that a abandoned incomplete Team does not linger.

22. As a Team member, I want a Team home that shows members, link state, optional name (or name fallback), and stats (games played, wins, losses, related counters), so that I can see partnership standing. Incomplete Teams show zeros plus waiting-for-partner copy.

23. As a Community Member, I want Community home to list Teams linked to that Community, so that I can open a linked Team’s stats even if I am not on that Team.

24. As an authenticated User, I want a personal My Teams list of Teams I sit on (linked or unattached), so that I can open my partnerships.

25. As a User who is not a Community Member and not a member of an unattached Team, I want opening that Team’s home to be refused (except invite-accept flows), so that Loose Team stats are not public.

26. As an Owner or Admin, I want Soft-archive to refuse new Team link requests and approve/reject of pending link requests for that Community, so that archived clubs do not gain new Club Teams.

27. As a User, I want Team invites and accept for **already linked** Teams to be refused while that Community is Soft-archived, so that seats cannot change on Club Teams during archive. Unattached Teams are unaffected.

28. As an allowed viewer, I want to still open a linked Team and see stats while the Community is Soft-archived, so that archive is not data loss for Teams.

29. As a developer of a later Game-completion slice, I want `game_teams` to already allow an optional Team id, so that wins can attribute to a Team without re-litigating schema.

30. As a User of the App, I want create-Team and Team UI to have no sport picker and always submit padel, so that padel-only UI stays consistent (`.scratch/padel-only-ui/spec.md`).

## Implementation Decisions

- Schema, migrations, and kit live in the DB Package. Follow existing Drizzle style: uuid PKs, Postgres enums plus TypeScript enums where needed, created/updated timestamps. New tables use the same unprefixed naming style as Group and Game. Kit table filter includes new tables.

- The App keeps its database re-export of the DB Package. tRPC routers register on the existing app router. No new Package, no new framework, no mail Package.

- **Team** table (conceptual): id; optional name; sport (reuse Group/Game sport enum values: padel | football); optional `communityId` (null = Loose Team; set = Club Team; restrict on Community delete, do not cascade); `createdBy` User; stored counters (`gamesPlayed`, `wins`, `losses`, and any related counters agreed in implementation — at minimum those three); timestamps. Community parent is **mutable** via link/unlink (diverges from ADR-0004 for Groups).

- **Team members**: unique (teamId, userId); at most two members per Team; creator inserted on create. No Team role column; creator is audit + incomplete-invite permission.

- **Global unordered pair uniqueness**: enforce so that the same two Users cannot have more than one Team. In-app pending invite to User B reserves the pair `(creator, B)`. Email invite reserves on accept (refuse accept if that User already shares a Team or reserved pair with the creator). Incomplete Teams with only the creator do not reserve a pair until an invite targets a concrete User (in-app) or Email accept binds a User.

- **Team in-app invites**: keyed by Team + invitee User; unused unique; `invitedBy`, `acceptedAt`, `revokedAt`. Mirror Group member invite patterns. Creator-only while incomplete; no open seat when full.

- **Team Email invites**: Team + email + token; unknown address OK; attach `userId` when known; Clerk then email must match; no expiry; revoke unused; one unused invite total for the open seat across both doors. Accept fills Team seat only — never Community membership. Mail: App-side stub/send following Community/Group Email invite pattern (provider TBD). Accept URLs under `/invites/team/email/[token]` (same invite-shell pattern; not behind dashboard auth wall).

- **No Team Invite link** table or product in v1.

- **Team link requests**: Team + Community + requester + status (pending | approved | rejected); optional decider. Only full Teams. Either member may request when full. Owner or Admin approve/reject on Public and Private. On approve (transaction): for each Team member missing Community membership, insert Member; set Team `communityId`; mark request approved. Reject leaves Team unattached. Soft-archived Community: refuse create request and approve/reject.

- **Unlink**: either Team member; clear `communityId`; cancel any pending link requests for that Team (any Community). Does not remove Community memberships that were granted by a prior link approve.

- **Leave Community**: extend existing leave to refuse if the caller is a member of any Team with `communityId` equal to that Community. Message should tell them to unlink or dissolve first. Leave Community still removes Club Group memberships as today when leave succeeds.

- **Remove Community sport**: refuse while any linked Team of that sport exists (and existing Club Group rule).

- **Soft-archive**: no change to Group/Community archive itself; add Team rules above. Linked Teams stay linked (do not become Loose on archive). Unarchive restores link request/invite rules.

- **Dissolve**: either member when full; creator when incomplete. Revoke unused invites; delete or cascade membership and invite rows; free the pair. Prefer hard delete of the Team row in v1 (no Soft-archive of Teams).

- **`game_teams`**: add nullable `teamId` referencing Team (`onDelete` set null or restrict — prefer set null so dissolving a Team does not block historical Game rows). No App writes to this FK in this slice. No Game create/score UI.

- **Stats**: read stored counters on Team. Do not compute from Games in this slice. Incomplete Teams still expose the stats block (zeros) with waiting-for-partner copy.

- **Authorization for Team home**:
  - Team member: always (including Soft-archived linked Community).
  - Community Member of the Team’s linked Community: may open linked Team (including Soft-archived, same as seeing Club Group history).
  - Others: refuse (except Email invite accept pages).

- **UI**: My Teams (hub or dedicated section listed from Teams the viewer sits on); create Team; Team home (members, invites if incomplete creator, link/unlink, stats); Community home section listing linked Teams for Members; staff queue for pending Team link requests on Community home. Reuse existing UI primitives. App create Team always submits `sport: "padel"` (no picker). No Directory of Teams.

- **Names**: Team names not globally unique (same as Groups/Communities).

## Testing Decisions

### What a good test is

Temba has no test suite and no CI. Do not add a test runner or CI. The test is external product behavior: signed-in flows in the App and the data those flows persist. Do not assert exact table JSON or router file names except as those flows fail.

### Test seams

Highest seam (one): an authenticated User can create a Team, invite a partner (in-app and Email), link/unlink with staff approve (including Private auto-admit), see stats UI (zeros), and respect Soft-archive and leave-Community refusal — without Game completion updating counters, and without Temba acting as an identity provider.

If you implement this spec, you implement these seams:

- Create Team unattached; creator sole member; App padel; tRPC may accept football
- Incomplete: creator in-app invite; accept fills seat; global pair reserved while pending
- Incomplete: Email invite unknown address; Clerk match joins Team only; mismatch does not consume; no Community membership from Email
- One unused open-seat invite at a time; revoke works
- Full Team: either member requests link; incomplete cannot
- Owner/Admin approve on Public and Private: auto-admit missing Members then attach; Member cannot approve
- Approve/request refused when sport not on Community sports; remove sport refused while linked Team of that sport exists
- Unlink by either member; pending link requests cancelled; re-link allowed when live
- Leave Community refused while on a linked Team; succeeds after unlink
- Dissolve full or incomplete; pair freed; invites revoked
- My Teams lists my Teams; Community home lists linked Teams for Members; non-member cannot open Loose Team home
- Soft-archive: refuse link request/decide; refuse invites/accept on linked Teams; unattached OK; viewers still open linked Team stats
- `game_teams.teamId` nullable exists; no Game UI required
- Stats show zeros (+ waiting copy when incomplete); no counter updates from Games
- Opening Team Email invite URL does not log anyone in without Clerk

Manual check: existing Community, Group, home, login, and Soft-archive flows still work. Route `/public` still redirects to login.

### Modules under that seam

DB Package schema for Team, membership, invites, link requests, and `game_teams.teamId`; App tRPC; dashboard My Teams / Team home / Community home Team list and link queue; Team Email invite accept page; App-side email send stub — only as they affect the flows above.

### Prior art

Community and Group invite/accept flows, Soft-archive refuse patterns, Community leave, Community sports allow-list, padel-only UI lock. No automated tests.

## Out of Scope

- Team Invite link
- Partner replace without dissolve
- Create Team already linked to a Community
- Link request from incomplete Teams
- Staff-required unlink
- Updating win/loss/games counters from completed Games (Game-completion slice)
- Game create, score entry, or Game display product (FK only)
- Inferring Team results from Game sides without Team id
- Directory of Teams; listing Teams anywhere except My Teams, Community home (linked), Team home, and invite URLs
- SMS; phone invites
- Temba as identity provider; magic-link auth
- Changing Group immutable parent (ADR-0004 stays for Groups)
- Football pickers in App UI (padel-only lock remains)
- CI, test runner, visual redesign beyond Team navigation surfaces
- Choosing a specific email vendor (provider TBD; stub OK)

## Further Notes

Glossary: Root `CONTEXT.md` (Team, Club Team, Loose Team, Game team; Member leave rule; Soft-archive Team clauses). Architecture: Teams **diverge** from ADR-0004 (Groups keep create-time immutable parent; Teams link/unlink). Consider a short ADR after this spec is approved if implementers need a durable “why” next to ADR-0004. Soft-archive: ADR-0005 plus Team rules in this spec.

Settled grilling: `.scratch/padel-teams/decisions.md`. Padel-only UI: `.scratch/padel-only-ui/spec.md`.

Locked v1 defaults (not a further grill): Email invite named, unknown OK, Clerk then email match, no expiry, revoke unused, one unused open-seat invite; no Team Invite link; link approve auto-admits on Public and Private; leave Community blocked while on linked Team; unlink immediate by either member; counters zero until Game-completion; App create Team always padel; names not globally unique; mail provider TBD.

## Implementation tickets (Linear)

All labelled `ready-for-agent`. Spec: `.scratch/padel-teams/spec.md`.

| # | Ticket | Blocked by |
|---|--------|------------|
| 1 | [TEM-18 Create Loose Team + My Teams + Team home](https://linear.app/temba-app/issue/TEM-18/create-loose-team-my-teams-team-home) | — |
| 2 | [TEM-19 In-app partner invite + dissolve](https://linear.app/temba-app/issue/TEM-19/in-app-partner-invite-dissolve) | TEM-18 |
| 3 | [TEM-20 Email partner invite](https://linear.app/temba-app/issue/TEM-20/email-partner-invite) | TEM-19 |
| 4 | [TEM-21 Link Team to Community](https://linear.app/temba-app/issue/TEM-21/link-team-to-community) | TEM-19 |
| 5 | [TEM-22 Unlink + leave-Community gate](https://linear.app/temba-app/issue/TEM-22/unlink-leave-community-gate) | TEM-21 |
| 6 | [TEM-23 Soft-archive Team rules](https://linear.app/temba-app/issue/TEM-23/soft-archive-team-rules) | TEM-20, TEM-21 |

Frontier: **TEM-18** only. Do not implement until an implementer / orchestrator is asked to run the tickets in order.
