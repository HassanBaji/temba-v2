# Deepen Soft-archive, Game admit, Community membership, Invite doors, and Friendly Game create

Status: ready-for-agent

Glossary terms locked in `CONTEXT.md`: Soft-archive, Game admit, Community membership, Invite doors (plus existing Lookup invite, Invite link, Waitlist, Game, Friendly game, Member, Venue).

Approving this spec approves the Test seams in Testing Decisions and the Implementation Decisions below.

## Problem Statement

Product behaviour for Soft-archive, Game register / invite accept / Waitlist promote, Community membership, Invite doors, and Friendly Game create already ships — but the rules are shallow and duplicated. Soft-archive checks re-read `archivedAt` at every door with different helpers and messages. Register, invite admit, and Waitlist promote each write Game teams; Friendly Match slots disagree (`sideIndex` vs `createdAt`). Club Group invite accept inserts Community Members inside the Group path. Lookup invite and Invite link mint/accept/revoke are copied across four hosts. Friendly create and Set-shell guarantees split across the create path and a Game home repair loop.

Agents and humans bounce between fat routers to change one glossary verb. Bugs hide in “how the helpers are called,” not in a single deep module. There is no Workspace test runner, so deepened interfaces cannot be verified except by full App flows.

## Solution

Deepen five App server domain modules behind small interfaces, with Vitest + PGLite as the test harness. Product behaviour stays the same; locality and leverage improve.

**Program order**

1. Soft-archive (Community, then Venue)
2. Game admit ∥ Community membership
3. Invite doors (all hosts)
4. Friendly Game create

**Soft-archive** — one module, two subjects (Community and Venue). Interface: `consult` + `commit`. Freeze kinds: `join` / `catalog` / `host`. Owns Club Group Game join-freeze. Registration-open stays cancel / window / organizer-close. Domain outcomes at the seam; tRPC adapters map to transport errors. Refuse ergonomics live only in the adapter helper.

**Game admit** — one `admit` with door (`register` | `promote`) and party (`user` | `pair` | `team`). Orchestrates Position occupancy; Waitlist stays and calls admit for promote; never enqueues Waitlist (`full` is a refusal). Friendly Match slots follow `sideIndex` only; team-only gets next free side; delete createdAt rewrite.

**Community membership** — `admit` (with role) + `leave` only. Callers decide auto-admit policy; membership performs the write. Leave does not consult Soft-archive.

**Invite doors** — one module, door kind × host (parameterized). Full lifecycle: mint / list / revoke / preview / accept. Consults Soft-archive; Game individual-seat accept requires Position and calls Game admit; Group auto-admit calls Community membership. Lookup search stays a sibling module.

**Friendly Game create** — one `createFriendlyGame` composing Venue/Court Soft-archive rules; owns Match + three Set shells; one-shot backfill for history; remove Game home ensure-3 repair. Americano / Friendly tournament create left untouched. Game `byId` read-model stays in the router.

## User Stories

### Soft-archive

1. As an Owner or Admin, I want to Soft-archive my Community through one Soft-archive module, so that every refuse door uses the same archived state.

2. As an Owner or Admin, I want to unarchive my Community through Soft-archive, so that joins, invites, Team links, Venue links, and Club Group Game register open again together.

3. As a User, I want join, Lookup invite, and Invite link mint/accept on a Soft-archived Community to be refused, so that Soft-archive means closed doors without deleting history.

4. As a User, I want leave Community to still work while Soft-archived, so that leave is never confused with Soft-archive.

5. As staff creating a Club Group or Club Group Game, I want Soft-archive to refuse new Club Groups and new Club Group Games while archived, so that the Community stays frozen for growth.

6. As a User on a Soft-archived Club Group Game, I want register, Waitlist join, and Game Invite doors to behave as closed, so that join-freeze is Soft-archive’s predicate, not a second copy of `archivedAt`.

7. As an organizer of a Soft-archived Club Group Game, I want reopen registration refused while join-frozen, so that Soft-archive cannot be bypassed by reopen.

8. As a User viewing Home or Group Games, I want existing Soft-archived Club Group Games still listed where product already allows history, so that Soft-archive is not a hard hide of past Games.

9. As a User browsing public pickup, I want Soft-archived Club Group Games excluded, so that pickup only shows live Communities’ Games.

10. As Owner or Admin, I want Team→Community link request and decide refused while Soft-archived, so that Club Team attachment cannot grow under archive.

11. As Owner or Admin, I want Venue link request refused while the Community is Soft-archived, so that Venue association follows Soft-archive.

12. As an Operator, I want to Soft-archive and unarchive a Venue through Soft-archive, so that Venue doors share one module with Community Soft-archive.

13. As Owner or Admin searching Venues for a Venue link, I want Soft-archived Venues hidden from the request catalog, so that only live Venues are choosable.

14. As an Operator deciding a Venue link request, I want refuse when either Community or Venue is Soft-archived, so that dual-subject freeze is owned once.

15. As a User creating an unlocked Game, I want Soft-archived Venues unavailable in the catalog, so that unlocked create only picks live Venues.

16. As an organizer assigning a Court, I want new Court assign refused on a Soft-archived Venue while skip/clear still allowed, so that Soft-archive matches the glossary Court rules.

17. As a Club Group with a locked Soft-archived Venue, I want Game create still possible with skip Court and no Venue swap, so that locked Soft-archived Venue behaviour stays product-correct.

18. As a maintainer, I want Soft-archive never to detach Club Groups, clear Venue links, flip Game public flags, or revoke Invite link tokens, so that Soft-archive stays a reversible hide (ADR-0005).

### Game admit

19. As a User self-registering on an individual Friendly game Position, I want occupancy written only through Game admit, so that seat join, invite accept, and promote share one write path.

20. As a User registering with a partner on a vacant side, I want Game admit to place the pair through one party, so that pair register is not a fourth writer.

21. As a User registering a complete Team on a team-only Game, I want Game admit to assign the next free sideIndex and bind Friendly Match slots from that index, so that slots never rewrite by createdAt.

22. As a User accepting a Game Lookup invite or Invite link on an individual seat Game, I want to supply sideIndex and Position and have Game admit perform occupancy, so that invite accept is not a separate admit implementation.

23. As a User promoted from Waitlist into a vacated Position, I want Waitlist to call Game admit with door promote, so that promote never reimplements pair-insert or slot rewrite.

24. As a User joining when the Game is full, I want Game admit to refuse `full` and the adapter to enqueue Waitlist, so that Waitlist stays the overflow module.

25. As a User joining when registration is closed, I want register-door admit refused for cancel/window/organizer-close, so that registration-open stays out of Soft-archive.

26. As a User joining a Soft-archived Club Group Game, I want Game admit to refuse join-frozen via Soft-archive consult, so that freeze is not re-read as raw archivedAt inside admit.

27. As Waitlist promote on a closed (but not Soft-archived) Game, I want promote-door admit to still seat the next eligible entry, so that closed Games keep promoting.

28. As a User on an Americano, I want Game admit pool placement without Position, so that Americano register stays individual-only without Friendly seat rules.

29. As a maintainer, I want duplicate pair-insert writers removed after invite and promote call Game admit, so that one occupancy bug cannot survive in three places.

30. As a User picking Friendly slot 2 / right first, I want Match slot 2 set from sideIndex and never rewritten by who joined first, so that seat choice sticks (individual-game-seats).

### Community membership

31. As Community create, I want Community membership admit with Owner role, so that Owner insert is not a special rogue write.

32. As join-request approve, I want Community membership admit with Member role, so that Public Community joins share one admit.

33. As Group Lookup invite or Invite link accept that auto-admits, I want the Group path to call Community membership admit, so that Community Members are not inserted inside the Group module.

34. As Team-link approve, I want each Team seat admitted as Member through Community membership, so that Club Team attachment shares admit.

35. As a User leaving a Community, I want Community membership leave to strip Club Group seats, refuse while seated on a linked Team, and refuse last Owner leave, so that leave rules live in one place.

36. As a User leaving a Soft-archived Community, I want leave still allowed without Soft-archive consult inside membership, so that leave ≠ Soft-archive.

37. As Invite doors deciding policy, I want to choose whether to auto-admit; Community membership only performs the write, so that staff Lookup vs Invite link policy stays at the door.

### Invite doors

38. As staff on a Community, I want Lookup invite and Invite link mint/list/revoke/preview/accept through Invite doors, so that Community invites are not a private copy of the door lifecycle.

39. As a Group creator or staff, I want the same Invite doors module with host Group, so that Club Group and Loose Group invites share one implementation.

40. As a Team member inviting the open seat, I want host Team on Invite doors, so that incomplete Team invites are not a third copy.

41. As a Game organizer minting Game invites, I want host Game on Invite doors, so that Game invites share Soft-archive and Game admit composition.

42. As Invite doors, I want Soft-archive consulted on mint and accept, so that Soft-archived hosts refuse consume without routers pre-checking.

43. As a User accepting a Game invite on an individual seat Game, I want accept to require Position up front, so that accept does not race a two-step needsSeat write.

44. As a User accepting a Club Group invite that auto-admits, I want Invite doors to call Community membership, so that Member insert stays out of Group-only code.

45. As a User accepting a Game invite, I want Invite doors to call Game admit after token/consent work, so that occupancy is not duplicated in invites.

46. As a sender searching Users for Lookup invite, I want search-lookup to stay a separate module called by Invite doors, so that query classification is not buried inside mint/accept.

47. As a User with a live Invite link token after Soft-archive, I want the token kept but accept refused until unarchive, so that ADR-0005 token rules hold.

### Friendly Game create

48. As an organizer creating a Friendly game, I want one createFriendlyGame entry point that places Venue, optional Court, Match, and three Set shells, so that create is not orchestration trapped in the router alone.

49. As createFriendlyGame, I want Venue Soft-archive rules composed from Soft-archive / Venue helpers, so that locked Soft-archived Venue and unlocked catalog stay correct.

50. As the product, I want historical Friendly games backfilled to three Set shells once, so that Game home does not forever repair shells in the browser.

51. As an organizer opening Game home after create, I want no ensure-3 Set repair effect, so that Set-shell locality stays at create.

52. As the App, I want Americano and Friendly tournament create left as they are this program, so that Friendly-only UI is not forced to deepen dead branches.

53. As the App, I want Game byId assembly left in the router this program, so that create deepening does not swallow the read-model.

### Workspace / maintainers / agents

54. As a maintainer, I want Soft-archive, Community membership, and Invite doors as App server modules (not new Packages), so that the cut matches ratings and ADR-0002 (one App).

55. As a maintainer, I want Game admit and Friendly create under the games domain next to seats/venue, so that Game verbs stay co-located.

56. As an agent changing Soft-archive policy, I want one freeze table / consult seam, so that I do not edit five routers for one glossary change.

57. As an agent changing Game occupancy, I want one Game admit interface, so that register, invite, and promote cannot drift.

58. As a maintainer, I want domain modules to return domain outcomes (not transport errors), so that Vitest can assert refuses without tRPC.

59. As a maintainer, I want Vitest + PGLite for Soft-archive and Game admit first, so that the highest seams have automated proof.

60. As a User of the shipped App, I want Soft-archive, register, invites, leave, and Friendly create to behave as today except where this spec deliberately unifies Friendly slot rules, so that deepening is not a product redesign.

## Implementation Decisions

### Program and placement

- Implement in program order: Soft-archive Community → Soft-archive Venue → (Game admit self-register ∥ Community membership) → Game admit invite/promote → Invite doors → Friendly Game create. Vitest + PGLite harness first.
- All modules live in the App server domain (same cut as ratings / games). No new Workspace Package.
- Soft-archive and Community membership are multi-file folders. Game admit and Friendly create live under the games domain beside seats/venue. Invite doors deepen the existing invites domain; search-lookup stays a sibling.
- No schema migrations required for Soft-archive / membership / admit / invites / Friendly create deepening except optional one-shot data backfill for Friendly Set shells.
- ADR-0005 Soft-archive semantics, ADR-0008 Game/Match naming, ADR-0002 one App, ADR-0009 ratings — not reopened.

### Soft-archive interface

Prototype shape (architecture design-it-twice; decision-rich parts only):

```ts
type Freeze = "join" | "catalog" | "host";
type Locator =
  | { communityId: string }
  | { clubGroupId: string }
  | { clubGroupGame: { groupId: string | null } }
  | { venueId: string };

// consult(db, locator) → view with freeze(kind) / notFound
// consult(snapshot) → view (already-loaded archivedAt)
// commit(db, { communityId } | { venueId }, "archived" | "live") → domain outcomes
```

- Soft-archive owns Club Group Game join-freeze (`freeze("join")` via clubGroupGame locator).
- Registration-open (cancel / window / organizer-close) stays outside Soft-archive.
- Domain outcomes only; adapters map to transport errors. Shared refuse helper is adapter-side, not a second Soft-archive export.
- Private Drizzle helper for bulk live-Venue `WHERE` may exist inside Soft-archive’s adapter; not part of the public interface.
- Auth (Owner/Admin vs Operator) stays at the procedure seam; Soft-archive owns state transition, not who may request it.
- Expand then migrate callers; contract old `requireLive*` / raw archivedAt door checks when Venue subject is done.

### Game admit interface

Prototype shape:

```ts
type AdmitDoor = "register" | "promote";
type AdmitParty =
  | { kind: "user"; userId: string; seat?: { sideIndex: number; position: "left" | "right" } }
  | { kind: "pair"; userIds: readonly [string, string]; sideIndex: number; callerPosition: "left" | "right" }
  | { kind: "team"; teamId: string };

// admit(tx, { game, door, party, now? }) → { ok: true, placement } | { ok: false, reason }
```

- Never writes Waitlist. `full` is a refusal; adapters enqueue.
- Never imports Waitlist (Waitlist imports admit).
- Orchestrates Position occupancy; does not absorb the seats module.
- Friendly Match slots follow sideIndex only; team-only assign next free sideIndex then bind slots; delete createdAt rewrite helper.
- Soft-archive join-freeze via Soft-archive consult; do not re-read archivedAt.
- Join-gate / invitee-allowed stay in callers (groupless invite vs self-register differ).
- Leftover unpaired game_players seating (already on Game) may keep calling seats directly; not Game admit’s `already_on_game` path.
- Collapse router pair-insert, invites admit*, and Waitlist pair-insert behind this seam.

### Community membership

- Interface: `admit({ communityId, userId, role })` and `leave` only.
- Role param covers Owner (create) and Member (join-request, invites, Team-link).
- Leave owns: strip Club Group memberships, refuse linked Team seat, refuse last Owner.
- Does not consult Soft-archive.
- Callers decide auto-admit policy; membership performs the write.

### Invite doors

- One module parameterized by host: Community | Group | Team | Game.
- Full lifecycle: mint / list / revoke / preview / accept for Lookup invite and Invite link.
- Consults Soft-archive on mint and accept.
- Game individual-seat accept requires sideIndex + Position; calls Game admit.
- Group auto-admit calls Community membership.
- Token mint / expiry / consent stay with Invite doors; Game admit does not consume tokens.
- search-lookup remains a separate module.

### Friendly Game create

- One `createFriendlyGame` entry point; Friendly-only this program.
- Composes Venue/Court Soft-archive rules; does not fold venue module into create.
- Owns Match + three Set shells in the create transaction.
- One-shot backfill for historical Friendly games missing shells; remove Game home ensure-3 repair.
- Americano / Friendly tournament create paths untouched.
- Game byId stays in the router.

### Cross-cutting

- Domain outcomes at deepened seams; tRPC adapters map to transport errors.
- Ratings / glicko2 / apply-rated-match / completeMatch / occupySeat internals — leverage, do not rewrite for their own sake.
- CONTEXT.md already includes Game admit, Invite doors, Community membership.

## Testing Decisions

### What a good test is

Assert observable behaviour through the module interface: Soft-archive phase and freeze answers, Game admit placements and refusals, membership admit/leave outcomes, Invite doors accept results, Friendly create shells. Do not assert router file structure, private helper names, or UI component trees. Prefer PGLite transactions that insert domain rows and call the seam. Adapter mapping to transport errors may be thin unit tests or left to App flows.

### Test seams

If you implement this spec, you implement these seams (approved):

1. **Soft-archive** (`consult` + `commit`) — Community/Venue Soft-archive and unarchive; freeze `join` / `catalog` / `host`; Club Group Game join-freeze; dual-subject Venue link refuse.
2. **Game admit** (`admit`) — self-register, invite-accept occupancy, Waitlist promote occupancy; Friendly slots follow sideIndex; `full` refusal without enqueue inside admit; promote vs register door policy.
3. **Community membership** (`admit` + `leave`) — role-bearing admit; leave strip/refuse rules.
4. **Invite doors** — mint/accept Soft-archive refuse; Game accept requires Position and calls Game admit; Group auto-admit calls Community membership.
5. **Friendly Game create** — Venue/Court composition; Match + three Set shells; Soft-archive Venue rules at create.

### Harness and priority

- Add Vitest + PGLite Workspace harness (this program introduces the runner; ratings’ “no runner” was slice-local).
- Soft-archive and Game admit suites land first; membership, Invite doors, and Friendly create follow in their tickets.
- Manual App flows still verify end-to-end UX (archive banners, seat grid, invite panels, Friendly create) after each vertical slice.

### Prior art

- Ratings: thin router + deep domain module (pattern to follow; no automated suite there).
- Soft-archive product rules: ADR-0005 and glossary Soft-archive.
- Friendly slots: `.scratch/individual-game-seats` (sideIndex, not createdAt).
- Invite channels: `.scratch/invite-lookup-and-link`.
- Friendly create Venue/Court: `.scratch/game-create-venue-court`.

## Out of Scope

- New product features (new Game formats, Email invite return, Directory, leaderboards)
- Second App or new Workspace Packages (ADR-0002)
- Replacing Glicko-2 or ratings module shape (ADR-0009)
- Renaming Game/Match (ADR-0008)
- Deepening Game byId read-model
- Deepening Americano / Friendly tournament create
- Inventing a second Clerk or Supabase adapter for its own sake
- Operator / Clerk auth redesign
- Absorbing seats, Waitlist FIFO, or venue modules into Game admit / create
- Flexible Soft-archive door/capability-map interface (rejected in grilling)
- Flexible Game admit intent protocol (rejected in grilling)
- CI pipeline beyond what Vitest needs to run locally in the Workspace

## Further Notes

- Settled grilling: architecture-review conversation (Soft-archive hybrid consult/commit; Game admit minimal `admit`; membership admit+leave; Invite doors host-parameterized; Friendly-only create; Vitest+PGLite; CONTEXT terms).
- Glossary PR / branch may already contain CONTEXT updates for Game admit, Invite doors, Community membership.
- Suggested ticket grain (from `/to-tickets` draft, not yet published): harness → Soft-archive Community → Soft-archive Venue → Game admit self-register ∥ Community membership → Game admit invite/promote → Invite doors → Friendly create.
- When publishing implementation tickets to Linear, link this spec at the top of each ticket body.
